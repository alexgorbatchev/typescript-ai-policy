import { isPascalCase } from "./helpers.js";

function isExternallyOwnedAmbientInterface(node) {
  if (node.declare === true && node.parent?.type !== "ExportNamedDeclaration") {
    return true;
  }

  let current = node.parent;

  while (current) {
    if (current.type === "TSModuleDeclaration") {
      if (current.declare === true || current.kind === "global" || current.id?.type === "Literal") {
        return true;
      }
    }

    current = current.parent;
  }

  return false;
}

function isValidInterfaceName(name) {
  if (!name.startsWith("I")) {
    return false;
  }

  const interfaceBaseName = name.slice(1);

  return interfaceBaseName.length > 0 && isPascalCase(interfaceBaseName);
}

const interfaceNamingConventionRule = {
  meta: {
    type: /** @type {const} */ ("problem"),
    docs: {
      description: 'Enforce repository-owned interface names to use the "I" prefix followed by PascalCase',
    },
    schema: [],
    messages: {
      unexpectedInterfaceName:
        'Rename interface "{{ name }}" to match "I[A-Z][A-Za-z0-9]*". Repository-owned interfaces must start with "I" and use PascalCase after the prefix.',
    },
  },
  create(context) {
    return {
      TSInterfaceDeclaration(node) {
        if (isExternallyOwnedAmbientInterface(node)) {
          return;
        }

        const interfaceName = node.id?.name;
        if (!interfaceName || isValidInterfaceName(interfaceName)) {
          return;
        }

        context.report({
          node: node.id ?? node,
          messageId: "unexpectedInterfaceName",
          data: {
            name: interfaceName,
          },
        });
      },
    };
  },
};

export default interfaceNamingConventionRule;
