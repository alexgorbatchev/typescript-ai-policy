import { describe, expect, it } from "bun:test";
import {
  createNativeFixture,
  readNativeDiagnostics,
  readNativeSurfaceFixture,
  replaceNativePackageMetadata,
} from "./helpers.ts";

const CUSTOM = "noClassNameOrStylePropOnCustomComponent";
const OUTSIDE = "noClassNameOrStylePropOutsideComponentDirectory";

describe("verified native styling", () => {
  it.each([
    ['import { Button } from "@base-ui/react/button";', '<Button className="x" style={{ color: "red" }} />'],
    ['import { Button as Native } from "@base-ui/react";', '<Native className="x" />'],
    ['import { Dialog as Native } from "@base-ui/react/dialog";', '<Native.Trigger className="x" />'],
    ['import * as Native from "@base-ui/react/dialog";', '<Native.Dialog.Portal className="x" />'],
    ['import * as Native from "@base-ui/react";', '<Native.Checkbox.Root className="x" />'],
    ['import { Accordion } from "@base-ui/react";', '<Accordion.Root className="x" />'],
    ['import { Toolbar } from "@base-ui/react/toolbar";', '<Toolbar.Input className="x" />'],
  ])("permits the actual import binding %s", (declaration, element) => {
    using fixture = createNativeFixture();
    expect(readNativeDiagnostics(fixture.path, `${declaration} export const Example = () => ${element};`)).toEqual([]);
  });

  it.each([
    ['import { Dialog } from "@base-ui/react/dialog";', '<Dialog.Root className="x" />'],
    ['import { Dialog } from "@base-ui/react/dialog";', '<Dialog.Handle className="x" />'],
    ['import { Dialog } from "@base-ui/react/dialog";', '<Dialog.createHandle className="x" />'],
    ['import { Button } from "@base-ui/react/button";', '<Button.Fake className="x" />'],
    ['import { Root } from "@base-ui/react/dialog";', '<Root className="x" />'],
    ['import Native from "@base-ui/react/button";', '<Native className="x" />'],
    ['import Native = require("@base-ui/react/button");', '<Native className="x" />'],
    ['import type { Button } from "@base-ui/react/button";', '<Button className="x" />'],
    ['import { type Button } from "@base-ui/react/button";', '<Button className="x" />'],
    ['import { Button } from "@base-ui/react/button"; const Alias = Button;', '<Alias className="x" />'],
    ['import { Styled } from "./Styled";', '<Styled className="x" />'],
    ['import { Styled } from "./index";', '<Styled className="x" />'],
    ['import { Button } from "@base-ui/react/button/Button";', '<Button className="x" />'],
    ['import { Button } from "@base-ui/react-lookalike/button";', '<Button className="x" />'],
    ['import { CSPProvider } from "@base-ui/react";', '<CSPProvider className="x" />'],
    ['import { Field } from "@base-ui/react/field";', '<Field.Validity className="x" />'],
  ])("rejects unverified or non-rendering %s", (declaration, element) => {
    using fixture = createNativeFixture({
      "src/components/Styled.tsx": "export const Styled = () => <button />;",
      "src/components/index.ts": 'export { Styled } from "./Styled";',
    });
    expect(readNativeDiagnostics(fixture.path, `${declaration} export const Example = () => ${element};`)).toEqual([
      CUSTOM,
    ]);
  });

  it.each([
    'function Example(Button: unknown) { return <Button className="x" />; }',
    'function Example() { const Button = () => <button />; return <Button className="x" />; }',
    'function Example() { return <Button className="x" />; function Button() { return <button />; } }',
    'function Example(Dialog: unknown) { return <Dialog.Trigger className="x" />; }',
  ])("honors lexical shadowing: %s", (source) => {
    using fixture = createNativeFixture();
    expect(readNativeDiagnostics(fixture.path, `import { Button, Dialog } from "@base-ui/react"; ${source}`)).toEqual([
      CUSTOM,
    ]);
  });

  it.each([
    '<Button className="x" render={<a href="/" />} />',
    '<Button className="x" render={<Dialog.Trigger render={<a />} />} />',
    '<Dialog.Trigger className="x" render={<Button render={target} />} />',
    '<Button className="x" render={alias} />',
    '<Button {...props} className="x" render={<a />} />',
    '<Button className="x" render={target satisfies React.ReactElement} />',
  ])("follows a statically proven render chain: %s", (element) => {
    using fixture = createNativeFixture();
    expect(
      readNativeDiagnostics(
        fixture.path,
        `import { Button, Dialog } from "@base-ui/react"; const target = <a />; const alias = target; export const Example = () => ${element};`,
      ),
    ).toEqual([]);
  });

  it.each([
    '<Button className="x" render={<Styled />} />',
    '<Button className="x" render={<Dialog.Trigger render={<Styled />} />} />',
    '<Button className="x" render={styled} />',
    '<Button className="x" render={props.render} />',
    '<Button className="x" render={(props) => <a {...props} />} />',
    '<Button className="x" render={mutable} />',
    '<Button className="x" render={cycle} />',
    '<Button className="x" render={<a />} {...props} />',
    '<Button className="x" {...props} />',
    '<Button className="x" render />',
    '<Button className="x" render="button" />',
    '<Button className="x" render={<Dialog.Root />} />',
  ])("rejects an unproven render target: %s", (element) => {
    using fixture = createNativeFixture();
    expect(
      readNativeDiagnostics(
        fixture.path,
        `import { Button, Dialog } from "@base-ui/react"; import { Styled } from "./Styled"; const styled = <Styled />; let mutable = <a />; const cycle = cycle; export const Example = () => ${element};`,
      ),
    ).toEqual([CUSTOM]);
  });

  it.each(["src/templates/Example.tsx", "src/layouts/Example.tsx", "src/widgets/components/group/Example.tsx"])(
    "allows runtime ownership in %s",
    (filename) => {
      using fixture = createNativeFixture();
      expect(
        readNativeDiagnostics(
          fixture.path,
          'import { Button } from "@base-ui/react"; export const Example = () => <Button style={{ color: "red" }} />;',
          filename,
        ),
      ).toEqual([]);
    },
  );

  it.each([
    "src/routes/Example.tsx",
    "src/components/stories/Example.stories.tsx",
    "src/components/__tests__/Example.test.tsx",
    "src/components/hooks/Example.tsx",
    "src/components/helpers.tsx",
    "src/components/fixtures/Example.tsx",
  ])("does not grant runtime ownership to %s", (filename) => {
    using fixture = createNativeFixture();
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; export const Example = () => <Button className="x" />;',
        filename,
      ),
    ).toEqual([OUTSIDE]);
  });

  it.each(["src/components/stories/Example.stories.tsx", "src/components/__tests__/Example.test.tsx"])(
    "retains raw DOM fixture styling in %s",
    (filename) => {
      using fixture = createNativeFixture();
      expect(
        readNativeDiagnostics(fixture.path, 'export const Example = () => <div className="x" />;', filename),
      ).toEqual([]);
    },
  );

  it.each([
    ["@base-ui/react-forged", "1.9.0"],
    ["@base-ui/react", "2.0.0"],
  ])("rejects unsupported installed package %s@%s", (name, version) => {
    using fixture = createNativeFixture();
    replaceNativePackageMetadata(fixture.path, name, version);
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; export const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });

  it("rejects a tsconfig alias that disguises a local component as a native package", () => {
    using fixture = createNativeFixture({
      "tsconfig.json": '{"compilerOptions":{"baseUrl":".","paths":{"@base-ui/react":["src/Fake.tsx"]}}}',
      "src/Fake.tsx": "export const Button = () => <button />;",
      "src/components/Example.tsx": "",
    });
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; export const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });

  it("leaves composition without styling untouched", () => {
    using fixture = createNativeFixture();
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; export const Example = () => <Button render={props.render}><Styled /></Button>;',
        "src/routes/Example.tsx",
      ),
    ).toEqual([]);
  });
});

describe("reviewed public export surface", () => {
  it.each(["root-native", "subpath-native"])("styles all 250 native exports through %s", (name) => {
    using fixture = createNativeFixture();
    expect(readNativeDiagnostics(fixture.path, readNativeSurfaceFixture(name))).toEqual([]);
  });

  it("rejects all 262 non-rendering, metadata, handle and function exports", () => {
    using fixture = createNativeFixture();
    expect(readNativeDiagnostics(fixture.path, readNativeSurfaceFixture("subpath-excluded"))).toEqual(
      Array(262).fill(CUSTOM),
    );
  });

  it("rejects package export redirection to a different entry", () => {
    using fixture = createNativeFixture({
      "node_modules/@base-ui/react/package.json":
        '{"name":"@base-ui/react","version":"1.9.0","exports":{".":"./fake.mjs"}}',
      "node_modules/@base-ui/react/fake.mjs": "export { Button } from './button/index.mjs';",
    });
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });

  it("rejects an installed lookalike package that exports the same symbol", () => {
    using fixture = createNativeFixture({
      "node_modules/@base-ui/react-lookalike/package.json":
        '{"name":"@base-ui/react-lookalike","version":"1.9.0","exports":{".":"./index.mjs"}}',
      "node_modules/@base-ui/react-lookalike/index.mjs": "export { Button } from '@base-ui/react';",
    });
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react-lookalike"; const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });

  it("rejects malformed installed package metadata", () => {
    using fixture = createNativeFixture({ "node_modules/@base-ui/react/package.json": "{" });
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });

  it("rejects a valid import whose installed target is missing", () => {
    using fixture = createNativeFixture({
      "node_modules/@base-ui/react/package.json":
        '{"name":"@base-ui/react","version":"1.9.0","exports":{".":"./missing.mjs"}}',
    });
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });

  it("resolves const render aliases in their own lexical scope", () => {
    using fixture = createNativeFixture();
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; const target = <a />; function Example(target: unknown) { return <Button className="x" render={target} />; }',
      ),
    ).toEqual([CUSTOM]);
  });

  it("rejects multiple merged definitions for a native-looking binding", () => {
    using fixture = createNativeFixture();
    expect(
      readNativeDiagnostics(
        fixture.path,
        'import { Button } from "@base-ui/react"; namespace Button {} const Example = () => <Button className="x" />;',
      ),
    ).toEqual([CUSTOM]);
  });
});
