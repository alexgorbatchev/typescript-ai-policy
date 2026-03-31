import { isFactoryFunctionName, isFixtureConstName, isFixturesFile, readChildNodes } from "./helpers.js";

function readRootQualifiedIdentifierName(node) {
  if (!node) {
    return null;
  }

  if (node.type === "Identifier") {
    return node.name;
  }

  if (node.type === "TSQualifiedName") {
    return readRootQualifiedIdentifierName(node.left);
  }

  return null;
}

function readTypeContractNodesForFixtureDeclarator(declarator) {
  const typeContractNodes = [];

  if (declarator.id.type === "Identifier" && declarator.id.typeAnnotation) {
    typeContractNodes.push(declarator.id.typeAnnotation.typeAnnotation);
  }

  if (declarator.init?.type === "TSSatisfiesExpression") {
    typeContractNodes.push(declarator.init.typeAnnotation);
  }

  return typeContractNodes;
}

// Best-effort only: this rule is intentionally syntactic. It can require fixture
// exports to reference imported type names and can reject explicit any/unknown in
// the local type contract, but it does not resolve imported aliases transitively.
// If an imported type eventually resolves to any/unknown elsewhere, this rule
// will not detect that.
function analyzeTypeContractNode(typeNode, importedTypeNames) {
  const state = {
    hasImportedTypeReference: false,
    hasAnyKeyword: false,
    hasUnknownKeyword: false,
  };

  visitNode(typeNode);
  return state;

  function visitNode(node) {
    if (!node) {
      return;
    }

    if (node.type === "TSAnyKeyword") {
      state.hasAnyKeyword = true;
    }

    if (node.type === "TSUnknownKeyword") {
      state.hasUnknownKeyword = true;
    }

    if (node.type === "TSTypeReference") {
      const rootQualifiedIdentifierName = readRootQualifiedIdentifierName(node.typeName);
      if (rootQualifiedIdentifierName && importedTypeNames.has(rootQualifiedIdentifierName)) {
        state.hasImportedTypeReference = true;
      }
    }

    if (node.type === "TSExpressionWithTypeArguments") {
      const rootQualifiedIdentifierName = readRootQualifiedIdentifierName(node.expression);
      if (rootQualifiedIdentifierName && importedTypeNames.has(rootQualifiedIdentifierName)) {
        state.hasImportedTypeReference = true;
      }
    }

    readChildNodes(node).forEach(visitNode);
  }
}

function readImportedTypeNames(program) {
  const importedTypeNames = new Set();

  program.body.forEach((statement) => {
    if (statement.type !== "ImportDeclaration") {
      return;
    }

    statement.specifiers.forEach((specifier) => {
      if (!specifier.local || specifier.local.type !== "Identifier") {
        return;
      }

      importedTypeNames.add(specifier.local.name);
    });
  });

  return importedTypeNames;
}

const fixtureExportTypeContractRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description:
        "Require fixture entrypoint exports to use imported types and ban explicit any/unknown type contracts",
    },
    schema: [],
    messages: {
      forbiddenFactoryReturnTypeKeyword:
        'Replace "{{ keyword }}" with an imported concrete return type for factory export "{{ name }}". Do not use "{{ keyword }}" in fixture entrypoints.',
      forbiddenFixtureTypeKeyword:
        'Replace "{{ keyword }}" with an imported concrete type for fixture export "{{ name }}". Do not use "{{ keyword }}" in fixture entrypoints.',
      missingFactoryReturnTypeContract:
        'Add an explicit return type to factory export "{{ name }}" and make that return type an imported concrete type.',
      missingFixtureTypeContract:
        'Add a type annotation or satisfies clause to fixture export "{{ name }}" and make it reference an imported concrete type.',
      missingImportedFactoryReturnType:
        'Change the return type of factory export "{{ name }}" so it references at least one imported concrete type.',
      missingImportedFixtureType:
        'Change the type annotation or satisfies clause of fixture export "{{ name }}" so it references at least one imported concrete type.',
    },
  },
  create(context) {
    if (!isFixturesFile(context.filename)) {
      return {};
    }

    let importedTypeNames = new Set();

    return {
      Program(program) {
        importedTypeNames = readImportedTypeNames(program);
      },
      ExportNamedDeclaration(node) {
        const declaration = node.declaration;
        if (!declaration) {
          return;
        }

        if (declaration.type === "VariableDeclaration") {
          declaration.declarations.forEach((declarator) => {
            if (declarator.id.type !== "Identifier" || !isFixtureConstName(declarator.id.name)) {
              return;
            }

            const typeContractNodes = readTypeContractNodesForFixtureDeclarator(declarator);
            if (typeContractNodes.length === 0) {
              context.report({
                node: declarator.id,
                messageId: "missingFixtureTypeContract",
                data: {
                  name: declarator.id.name,
                },
              });
              return;
            }

            const typeContractAnalyses = typeContractNodes.map((typeContractNode) => {
              return analyzeTypeContractNode(typeContractNode, importedTypeNames);
            });
            if (typeContractAnalyses.some((typeContractAnalysis) => typeContractAnalysis.hasAnyKeyword)) {
              context.report({
                node: declarator.id,
                messageId: "forbiddenFixtureTypeKeyword",
                data: {
                  name: declarator.id.name,
                  keyword: "any",
                },
              });
              return;
            }

            if (typeContractAnalyses.some((typeContractAnalysis) => typeContractAnalysis.hasUnknownKeyword)) {
              context.report({
                node: declarator.id,
                messageId: "forbiddenFixtureTypeKeyword",
                data: {
                  name: declarator.id.name,
                  keyword: "unknown",
                },
              });
              return;
            }

            if (typeContractAnalyses.some((typeContractAnalysis) => typeContractAnalysis.hasImportedTypeReference)) {
              return;
            }

            context.report({
              node: declarator.id,
              messageId: "missingImportedFixtureType",
              data: {
                name: declarator.id.name,
              },
            });
          });
          return;
        }

        if (
          declaration.type !== "FunctionDeclaration" ||
          !declaration.id ||
          !isFactoryFunctionName(declaration.id.name)
        ) {
          return;
        }

        const returnTypeNode = declaration.returnType?.typeAnnotation;
        if (!returnTypeNode) {
          context.report({
            node: declaration.id,
            messageId: "missingFactoryReturnTypeContract",
            data: {
              name: declaration.id.name,
            },
          });
          return;
        }

        const returnTypeAnalysis = analyzeTypeContractNode(returnTypeNode, importedTypeNames);
        if (returnTypeAnalysis.hasAnyKeyword) {
          context.report({
            node: declaration.id,
            messageId: "forbiddenFactoryReturnTypeKeyword",
            data: {
              name: declaration.id.name,
              keyword: "any",
            },
          });
          return;
        }

        if (returnTypeAnalysis.hasUnknownKeyword) {
          context.report({
            node: declaration.id,
            messageId: "forbiddenFactoryReturnTypeKeyword",
            data: {
              name: declaration.id.name,
              keyword: "unknown",
            },
          });
          return;
        }

        if (returnTypeAnalysis.hasImportedTypeReference) {
          return;
        }

        context.report({
          node: declaration.id,
          messageId: "missingImportedFactoryReturnType",
          data: {
            name: declaration.id.name,
          },
        });
      },
    };
  },
};

export default fixtureExportTypeContractRule;
