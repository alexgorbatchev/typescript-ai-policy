import testIdNamingConventionRule from "./rules/testid-naming-convention.js";
import noReactCreateElementRule from "./rules/no-react-create-element.js";
import requireComponentRootTestIdRule from "./rules/require-component-root-testid.js";

const plugin = {
  meta: {
    name: "@alexgorbatchev",
  },
  rules: {
    "testid-naming-convention": testIdNamingConventionRule,
    "no-react-create-element": noReactCreateElementRule,
    "require-component-root-testid": requireComponentRootTestIdRule,
  },
};

export default plugin;
