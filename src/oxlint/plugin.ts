import testIdNamingConventionRule from "./rules/testid-naming-convention.ts";
import noReactCreateElementRule from "./rules/no-react-create-element.ts";
import requireComponentRootTestIdRule from "./rules/require-component-root-testid.ts";
import noNonRunningTestsRule from "./rules/no-non-running-tests.ts";
import noConditionalLogicInTestsRule from "./rules/no-conditional-logic-in-tests.ts";
import noThrowInTestsRule from "./rules/no-throw-in-tests.ts";
import requireTemplateIndentRule from "./rules/require-template-indent.ts";
import noModuleMockingRule from "./rules/no-module-mocking.ts";
import noTestFileExportsRule from "./rules/no-test-file-exports.ts";
import noImportsFromTestsDirectoryRule from "./rules/no-imports-from-tests-directory.ts";
import indexFileContractRule from "./rules/index-file-contract.ts";
import noTypeImportsFromConstantsRule from "./rules/no-type-imports-from-constants.ts";
import noTypeExportsFromConstantsRule from "./rules/no-type-exports-from-constants.ts";
import noValueExportsFromTypesRule from "./rules/no-value-exports-from-types.ts";
import interfaceNamingConventionRule from "./rules/interface-naming-convention.ts";
import noIPrefixedTypeAliasesRule from "./rules/no-i-prefixed-type-aliases.ts";
import noInlineTypeExpressionsRule from "./rules/no-inline-type-expressions.ts";
import noInlineTypeImportsRule from "./rules/no-inline-type-imports.ts";
import noDirectInterfaceToTypeAssignmentRule from "./rules/no-direct-interface-to-type-assignment.ts";
import componentFileLocationConventionRule from "./rules/component-file-location-convention.ts";
import componentDirectoryFileConventionRule from "./rules/component-directory-file-convention.ts";
import componentFileContractRule from "./rules/component-file-contract.ts";
import componentFileNamingConventionRule from "./rules/component-file-naming-convention.ts";
import componentStoryFileConventionRule from "./rules/component-story-file-convention.ts";
import storiesDirectoryFileConventionRule from "./rules/stories-directory-file-convention.ts";
import storyFileLocationConventionRule from "./rules/story-file-location-convention.ts";
import storyMetaTypeAnnotationRule from "./rules/story-meta-type-annotation.ts";
import storyTitleConventionRule from "./rules/story-title-convention.ts";
import storyExportContractRule from "./rules/story-export-contract.ts";
import hookExportLocationConventionRule from "./rules/hook-export-location-convention.ts";
import hooksDirectoryFileConventionRule from "./rules/hooks-directory-file-convention.ts";
import hookFileContractRule from "./rules/hook-file-contract.ts";
import hookFileNamingConventionRule from "./rules/hook-file-naming-convention.ts";
import hookTestFileConventionRule from "./rules/hook-test-file-convention.ts";
import testFileLocationConventionRule from "./rules/test-file-location-convention.ts";
import testsDirectoryFileConventionRule from "./rules/tests-directory-file-convention.ts";
import fixtureFileContractRule from "./rules/fixture-file-contract.ts";
import fixtureExportNamingConventionRule from "./rules/fixture-export-naming-convention.ts";
import fixtureExportTypeContractRule from "./rules/fixture-export-type-contract.ts";
import noFixtureExportsOutsideFixtureEntrypointRule from "./rules/no-fixture-exports-outside-fixture-entrypoint.ts";
import noInlineFixtureBindingsInTestsRule from "./rules/no-inline-fixture-bindings-in-tests.ts";
import fixtureImportPathConventionRule from "./rules/fixture-import-path-convention.ts";
import noLocalTypeDeclarationsInFixtureFilesRule from "./rules/no-local-type-declarations-in-fixture-files.ts";
import singleFixtureEntrypointRule from "./rules/single-fixture-entrypoint.ts";
import noLintDisableCommentsRule from "./rules/no-lint-disable-comments.ts";

type PluginMeta = {
  name: string;
};

type PluginRules = Record<string, unknown>;

type OxlintPlugin = {
  meta: PluginMeta;
  rules: PluginRules;
};

// Keep the published plugin type minimal so generated declarations do not inline
// the entire @typescript-eslint rule type graph into this package's public API.
const plugin: OxlintPlugin = {
  meta: {
    name: "@alexgorbatchev",
  },
  rules: {
    "testid-naming-convention": testIdNamingConventionRule,
    "no-react-create-element": noReactCreateElementRule,
    "require-component-root-testid": requireComponentRootTestIdRule,
    "no-non-running-tests": noNonRunningTestsRule,
    "no-conditional-logic-in-tests": noConditionalLogicInTestsRule,
    "no-throw-in-tests": noThrowInTestsRule,
    "require-template-indent": requireTemplateIndentRule,
    "no-module-mocking": noModuleMockingRule,
    "no-test-file-exports": noTestFileExportsRule,
    "no-imports-from-tests-directory": noImportsFromTestsDirectoryRule,
    "index-file-contract": indexFileContractRule,
    "no-type-imports-from-constants": noTypeImportsFromConstantsRule,
    "no-type-exports-from-constants": noTypeExportsFromConstantsRule,
    "no-value-exports-from-types": noValueExportsFromTypesRule,
    "interface-naming-convention": interfaceNamingConventionRule,
    "no-i-prefixed-type-aliases": noIPrefixedTypeAliasesRule,
    "no-direct-interface-to-type-assignment": noDirectInterfaceToTypeAssignmentRule,
    "no-inline-type-expressions": noInlineTypeExpressionsRule,
    "no-inline-type-imports": noInlineTypeImportsRule,
    "component-file-location-convention": componentFileLocationConventionRule,
    "component-directory-file-convention": componentDirectoryFileConventionRule,
    "component-file-contract": componentFileContractRule,
    "component-file-naming-convention": componentFileNamingConventionRule,
    "component-story-file-convention": componentStoryFileConventionRule,
    "stories-directory-file-convention": storiesDirectoryFileConventionRule,
    "story-file-location-convention": storyFileLocationConventionRule,
    "story-meta-type-annotation": storyMetaTypeAnnotationRule,
    "story-title-convention": storyTitleConventionRule,
    "story-export-contract": storyExportContractRule,
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
    "no-lint-disable-comments": noLintDisableCommentsRule,
  },
};

export default plugin;
