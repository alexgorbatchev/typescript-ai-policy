import { readFileSync } from "node:fs";
import { dirname, relative, sep } from "node:path";
import { ResolverFactory } from "oxc-resolver";
import type { TSESTree } from "@typescript-eslint/utils";
import { findLexicalVariable } from "./findLexicalVariable.ts";
import { isBaseUiPrimitiveExport, readBaseUiEntryPath } from "./baseUiPrimitives.ts";
import type { RuleContext } from "../types.ts";

type JsxName = TSESTree.JSXOpeningElement["name"];
type BindingPath = { root: TSESTree.JSXIdentifier; members: string[] };
type NativeImportMatcher = (name: JsxName) => boolean;

function readJsxBinding(name: JsxName): BindingPath | null {
  if (name.type === "JSXIdentifier") return { root: name, members: [] };
  if (name.type !== "JSXMemberExpression") return null;
  const binding = readJsxBinding(name.object);
  return binding ? { root: binding.root, members: [...binding.members, name.property.name] } : null;
}

function isReviewedPackage(packageJsonPath: string): boolean {
  const metadata: unknown = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  return (
    typeof metadata === "object" &&
    metadata !== null &&
    "name" in metadata &&
    metadata.name === "@base-ui/react" &&
    "version" in metadata &&
    metadata.version === "1.9.0"
  );
}

export function createNativeImportMatcher(context: RuleContext): NativeImportMatcher {
  const resolver = new ResolverFactory({
    tsconfig: "auto",
    conditionNames: ["import", "default"],
    extensions: [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"],
    mainFields: ["module", "main"],
  });

  function hasReviewedProvenance(source: string): boolean {
    const entryPath = readBaseUiEntryPath(source);
    if (entryPath === null) return false;
    try {
      const resolved = resolver.resolveFileSync(context.filename, source);
      if (!resolved.path || !resolved.packageJsonPath || !isReviewedPackage(resolved.packageJsonPath)) return false;
      const actualEntry = relative(dirname(resolved.packageJsonPath), resolved.path).split(sep).join("/");
      return actualEntry === `${entryPath}.mjs` || actualEntry === `${entryPath}.js`;
    } catch {
      return false;
    }
  }

  return (name) => {
    const binding = readJsxBinding(name);
    if (!binding) return false;
    const variable = findLexicalVariable(context, binding.root, binding.root.name);
    if (!variable || variable.defs.length !== 1) return false;
    const definition = variable.defs[0];
    if (
      !definition ||
      definition.type !== "ImportBinding" ||
      definition.parent.type !== "ImportDeclaration" ||
      definition.parent.importKind === "type"
    )
      return false;
    const specifier = definition.node;
    let exportPath: string[];
    if (specifier.type === "ImportSpecifier" && specifier.importKind !== "type") {
      const imported = specifier.imported;
      exportPath = [imported.type === "Identifier" ? imported.name : imported.value, ...binding.members];
    } else if (specifier.type === "ImportNamespaceSpecifier") {
      exportPath = binding.members;
    } else {
      return false;
    }
    const source = definition.parent.source.value;
    return isBaseUiPrimitiveExport(source, exportPath) && hasReviewedProvenance(source);
  };
}
