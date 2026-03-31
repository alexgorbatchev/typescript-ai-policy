import testIdNamingConventionRule from "./rules/testid-naming-convention.js";
import noReactCreateElementRule from "./rules/no-react-create-element.js";
import requireComponentRootTestIdRule from "./rules/require-component-root-testid.js";
import noNonRunningTestsRule from "./rules/no-non-running-tests.js";
import noModuleMockingRule from "./rules/no-module-mocking.js";
import noTestFileExportsRule from "./rules/no-test-file-exports.js";
import noImportsFromTestsDirectoryRule from "./rules/no-imports-from-tests-directory.js";
import indexFileContractRule from "./rules/index-file-contract.js";
import noTypeImportsFromConstantsRule from "./rules/no-type-imports-from-constants.js";
import noTypeExportsFromConstantsRule from "./rules/no-type-exports-from-constants.js";
import noValueExportsFromTypesRule from "./rules/no-value-exports-from-types.js";
import componentFileLocationConventionRule from "./rules/component-file-location-convention.js";
import componentDirectoryFileConventionRule from "./rules/component-directory-file-convention.js";
import componentFileContractRule from "./rules/component-file-contract.js";
import componentFileNamingConventionRule from "./rules/component-file-naming-convention.js";
import componentTestFileConventionRule from "./rules/component-test-file-convention.js";
import hookExportLocationConventionRule from "./rules/hook-export-location-convention.js";
import hooksDirectoryFileConventionRule from "./rules/hooks-directory-file-convention.js";
import hookFileContractRule from "./rules/hook-file-contract.js";
import hookFileNamingConventionRule from "./rules/hook-file-naming-convention.js";
import hookTestFileConventionRule from "./rules/hook-test-file-convention.js";
import testFileLocationConventionRule from "./rules/test-file-location-convention.js";
import testsDirectoryFileConventionRule from "./rules/tests-directory-file-convention.js";
import fixtureFileContractRule from "./rules/fixture-file-contract.js";
import fixtureExportNamingConventionRule from "./rules/fixture-export-naming-convention.js";
import fixtureExportTypeContractRule from "./rules/fixture-export-type-contract.js";
import noFixtureExportsOutsideFixtureEntrypointRule from "./rules/no-fixture-exports-outside-fixture-entrypoint.js";
import noInlineFixtureBindingsInTestsRule from "./rules/no-inline-fixture-bindings-in-tests.js";
import fixtureImportPathConventionRule from "./rules/fixture-import-path-convention.js";
import noLocalTypeDeclarationsInFixtureFilesRule from "./rules/no-local-type-declarations-in-fixture-files.js";
import singleFixtureEntrypointRule from "./rules/single-fixture-entrypoint.js";

const plugin = {
  meta: {
    name: "@alexgorbatchev",
  },
  rules: {
    "testid-naming-convention": testIdNamingConventionRule,
    "no-react-create-element": noReactCreateElementRule,
    "require-component-root-testid": requireComponentRootTestIdRule,
    "no-non-running-tests": noNonRunningTestsRule,
    "no-module-mocking": noModuleMockingRule,
    "no-test-file-exports": noTestFileExportsRule,
    "no-imports-from-tests-directory": noImportsFromTestsDirectoryRule,
    "index-file-contract": indexFileContractRule,
    "no-type-imports-from-constants": noTypeImportsFromConstantsRule,
    "no-type-exports-from-constants": noTypeExportsFromConstantsRule,
    "no-value-exports-from-types": noValueExportsFromTypesRule,
    "component-file-location-convention": componentFileLocationConventionRule,
    "component-directory-file-convention": componentDirectoryFileConventionRule,
    "component-file-contract": componentFileContractRule,
    "component-file-naming-convention": componentFileNamingConventionRule,
    "component-test-file-convention": componentTestFileConventionRule,
    "hook-export-location-convention": hookExportLocationConventionRule,
    "hooks-directory-file-convention": hooksDirectoryFileConventionRule,
    "hook-file-contract": hookFileContractRule,
    "hook-file-naming-convention": hookFileNamingConventionRule,
    "hook-test-file-convention": hookTestFileConventionRule,
    "test-file-location-convention": testFileLocationConventionRule,
    "tests-directory-file-convention": testsDirectoryFileConventionRule,
    "fixture-file-contract": fixtureFileContractRule,
    "fixture-export-naming-convention": fixtureExportNamingConventionRule,
    "fixture-export-type-contract": fixtureExportTypeContractRule,
    "no-fixture-exports-outside-fixture-entrypoint": noFixtureExportsOutsideFixtureEntrypointRule,
    "no-inline-fixture-bindings-in-tests": noInlineFixtureBindingsInTestsRule,
    "fixture-import-path-convention": fixtureImportPathConventionRule,
    "no-local-type-declarations-in-fixture-files": noLocalTypeDeclarationsInFixtureFilesRule,
    "single-fixture-entrypoint": singleFixtureEntrypointRule,
  },
};

export default plugin;
