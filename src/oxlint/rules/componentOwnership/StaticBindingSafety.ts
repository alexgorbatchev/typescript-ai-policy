import type { Node, Program } from "oxc-parser";
import { isReferenceIdentifier, ScopeTracker, walk } from "oxc-walker";

/** Conservative, flow-insensitive object identity analysis over Oxc's lexical bindings. */
export class StaticBindingSafety {
  private readonly parents = new Map<Node, Node>();
  private readonly dependencies = new Map<Node, Set<Node>>();
  private readonly nestedDependencies = new Map<Node, Set<Node>>();
  private readonly spreadDependencies = new Map<Node, Set<Node>>();
  private readonly unsafe = new Set<Node>();
  private readonly deeplyUnsafe = new Set<Node>();
  private readonly pending: Node[] = [];

  constructor(program: Program) {
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
        if (node.type === "ObjectExpression") {
          if (node.properties.some((property) => property.type === "Property" && property.kind !== "init"))
            this.markUnsafe(node, true);
          this.readUse(node, node);
        } else if (node.type === "Identifier" && isReferenceIdentifier(node, parent)) {
          const declaration = scopeTracker.getDeclaration(node.name);
          if (declaration && declaration.node !== node) this.readUse(declaration.node, node);
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
