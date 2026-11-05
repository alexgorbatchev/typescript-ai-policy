import type { CallExpression, Node, Program } from "oxc-parser";
import { isReferenceIdentifier, ScopeTracker, walk } from "oxc-walker";
import { readBindingPath } from "./readBindingPath.ts";

// These standard static methods do not mutate their Object receiver. Object
// arguments still pass through the ordinary mutation/escape analysis below.
const OBJECT_STATIC_METHODS = new Set([
  "assign",
  "create",
  "defineProperties",
  "defineProperty",
  "entries",
  "freeze",
  "fromEntries",
  "getOwnPropertyDescriptor",
  "getOwnPropertyDescriptors",
  "getOwnPropertyNames",
  "getOwnPropertySymbols",
  "getPrototypeOf",
  "groupBy",
  "hasOwn",
  "is",
  "isExtensible",
  "isFrozen",
  "isSealed",
  "keys",
  "preventExtensions",
  "seal",
  "setPrototypeOf",
  "values",
]);

/** Conservative, flow-insensitive object identity analysis over Oxc's lexical bindings. */
export class StaticBindingSafety {
  private readonly parents = new Map<Node, Node>();
  private readonly dependencies = new Map<Node, Set<Node>>();
  private readonly nestedDependencies = new Map<Node, Set<Node>>();
  private readonly spreadDependencies = new Map<Node, Set<Node>>();
  private readonly unsafe = new Set<Node>();
  private readonly deeplyUnsafe = new Set<Node>();
  private readonly pending: Node[] = [];
  private readonly objectAssignments = new Set<Node>();
  private readonly globalObject: Program;

  constructor(program: Program) {
    this.globalObject = program;
    const scopeTracker = new ScopeTracker({ preserveExitedScopes: true });
    walk(program, {
      scopeTracker,
      enter: (node, parent) => {
        if (parent) this.parents.set(node, parent);
      },
    });
    scopeTracker.freeze();
    walk(program, {
      scopeTracker,
      enter: (node, parent) => {
        if (node.type === "CallExpression") {
          this.readObjectAssignment(node, scopeTracker);
        } else if (node.type === "ObjectExpression") {
          if (node.properties.some((property) => property.type === "Property" && property.kind !== "init"))
            this.markUnsafe(node, true);
          this.readUse(node, node);
        } else if (node.type === "Identifier" && isReferenceIdentifier(node, parent)) {
          const declaration = scopeTracker.getDeclaration(node.name);
          if (declaration && declaration.node !== node) this.readUse(declaration.node, node);
          else if (!declaration && (node.name === "Object" || node.name === "Function"))
            this.readUse(this.globalObject, node);
          else if (
            !declaration &&
            node.name === "globalThis" &&
            parent?.type === "MemberExpression" &&
            ["globalThis.Object", "globalThis.Function"].includes(readBindingPath(parent)?.join(".") ?? "")
          )
            this.readUse(this.globalObject, parent);
        }
      },
    });
    for (let index = 0; index < this.pending.length; index++) {
      const node = this.pending[index];
      if (!node) continue;
      const deep = this.deeplyUnsafe.has(node);
      for (const dependency of this.dependencies.get(node) ?? []) this.markUnsafe(dependency, deep);
      for (const dependency of this.nestedDependencies.get(node) ?? []) this.markUnsafe(dependency, true);
      if (deep) {
        for (const dependency of this.spreadDependencies.get(node) ?? []) this.markUnsafe(dependency, true);
      }
    }
  }

  isStable(node: Node): boolean {
    return !this.unsafe.has(node);
  }

  isObjectAssignment(node: Node): node is CallExpression {
    return this.objectAssignments.has(node) && this.isStable(this.globalObject) && this.isStable(node);
  }

  private readObjectAssignment(node: CallExpression, scopes: ScopeTracker): void {
    const target = node.arguments[0];
    if (
      node.optional ||
      scopes.getDeclaration("Object") ||
      readBindingPath(node.callee)?.join(".") !== "Object.assign" ||
      !target ||
      (target.type !== "FunctionExpression" && target.type !== "ArrowFunctionExpression") ||
      node.arguments.some((argument) => argument.type === "SpreadElement")
    )
      return;
    this.objectAssignments.add(node);
    // Object.assign returns the same fresh function, including its named self-binding.
    this.dependOn(node, target);
    this.dependOn(target, node);
    this.readUse(node, node);
  }

  private markUnsafe(node: Node, deep: boolean): void {
    if (this.unsafe.has(node) && (!deep || this.deeplyUnsafe.has(node))) return;
    this.unsafe.add(node);
    if (deep) this.deeplyUnsafe.add(node);
    this.pending.push(node);
  }

  private dependOn(container: Node, value: Node, graph = this.dependencies): void {
    const dependencies = graph.get(container) ?? new Set<Node>();
    dependencies.add(value);
    graph.set(container, dependencies);
  }

  private readUse(identity: Node, reference: Node): void {
    let value = reference;
    let parent = this.parents.get(value);
    let memberDepth = 0;
    while (
      parent &&
      ((parent.type === "MemberExpression" && parent.object === value) ||
        ((parent.type === "TSAsExpression" ||
          parent.type === "TSSatisfiesExpression" ||
          parent.type === "TSNonNullExpression" ||
          parent.type === "ChainExpression") &&
          parent.expression === value))
    ) {
      if (parent.type === "MemberExpression") memberDepth++;
      value = parent;
      parent = this.parents.get(value);
    }
    if (!parent) return;
    if (parent.type === "CallExpression") {
      if (identity === this.globalObject && parent.callee === value) {
        const path = readBindingPath(parent.callee);
        if (path?.length === 2 && path[0] === "Object" && path[1] && OBJECT_STATIC_METHODS.has(path[1])) return;
      }
      if (this.objectAssignments.has(parent) && parent.arguments.some((argument) => argument === value)) {
        // Sources are shallow-copied; later nested writes through the result can
        // affect them, but the known native call does not itself escape them.
        this.dependOn(parent, identity, this.spreadDependencies);
        return;
      }
    }
    if (parent.type === "VariableDeclarator" && parent.init === value && parent.id.type === "Identifier") {
      const declaration = this.parents.get(parent);
      if (declaration?.type === "VariableDeclaration" && declaration.kind === "const") {
        // A member alias may share an object nested inside the referenced identity.
        this.dependOn(parent.id, identity, memberDepth > 0 ? this.nestedDependencies : this.dependencies);
        this.dependOn(identity, parent.id);
        return;
      }
    }
    if (parent.type === "Property" && parent.value === value && parent.kind === "init" && !parent.method) {
      const container = this.parents.get(parent);
      if (container?.type === "ObjectExpression") {
        // Storing an object preserves its identity; mutating or escaping the container
        // therefore invalidates its stored values too. Spreads deliberately do not.
        this.dependOn(container, identity);
        return;
      }
    }
    if (parent.type === "SpreadElement") {
      const container = this.parents.get(parent);
      if (container?.type === "ObjectExpression") {
        // A spread copies own properties, but nested values retain their identities.
        this.dependOn(container, identity, this.spreadDependencies);
        return;
      }
    }
    if (parent.type === "ExportDefaultDeclaration" || parent.type === "ExportSpecifier") return;
    if (parent.type === "TSTypeQuery" || parent.type === "TSQualifiedName") return;
    if (parent.type === "ExpressionStatement") return;
    if (parent.type === "UnaryExpression" && ["typeof", "void", "!"].includes(parent.operator)) return;
    if (parent.type === "BinaryExpression" && ["===", "!=="].includes(parent.operator)) return;
    const shallowWrite =
      memberDepth === 1 &&
      ((parent.type === "AssignmentExpression" && parent.left === value) ||
        parent.type === "UpdateExpression" ||
        (parent.type === "UnaryExpression" && parent.operator === "delete") ||
        ((parent.type === "ForOfStatement" || parent.type === "ForInStatement") && parent.left === value));
    this.markUnsafe(identity, !shallowWrite);
  }
}
