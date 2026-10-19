import { expect, it } from "bun:test";
import { parse } from "@typescript-eslint/parser";
import { isReactClientEntrypoint } from "../helpers.ts";

const importRoot = 'import { createRoot } from "react-dom/client";';
const renderRoot = "createRoot(container).render(<App />);";

it.each([
  { name: "chained root", code: `${importRoot} ${renderRoot}`, filename: "src/main.tsx" },
  {
    name: "bound root",
    code: `${importRoot} const root = createRoot(container); root.render(<App />);`,
    filename: "src/main.tsx",
  },
  {
    name: "aliased import and fragment",
    code: 'import { createRoot as mount } from "react-dom/client"; mount(container).render(<><App /></>);',
    filename: "src/main.tsx",
  },
])("recognizes $name", ({ code, filename }) => {
  expect(isReactClientEntrypoint(filename, parse(code, { ecmaFeatures: { jsx: true } }))).toBe(true);
});

it.each([
  { name: "filename alone", code: "const value = 1;", filename: "src/main.tsx" },
  { name: "other filename", code: `${importRoot} ${renderRoot}`, filename: "src/widget.tsx" },
  { name: "component directory", code: `${importRoot} ${renderRoot}`, filename: "src/components/main.tsx" },
  { name: "missing import", code: renderRoot, filename: "src/main.tsx" },
  { name: "unrelated import", code: `import { createRoot } from "other"; ${renderRoot}`, filename: "src/main.tsx" },
  {
    name: "type import",
    code: `import type { createRoot } from "react-dom/client"; ${renderRoot}`,
    filename: "src/main.tsx",
  },
  {
    name: "type specifier",
    code: `import { type createRoot } from "react-dom/client"; ${renderRoot}`,
    filename: "src/main.tsx",
  },
  {
    name: "namespace import",
    code: `import * as client from "react-dom/client"; ${renderRoot}`,
    filename: "src/main.tsx",
  },
  {
    name: "wrong import",
    code: `import { hydrateRoot } from "react-dom/client"; ${renderRoot}`,
    filename: "src/main.tsx",
  },
  {
    name: "exported component",
    code: `${importRoot} export function App() { return <View />; } ${renderRoot}`,
    filename: "src/main.tsx",
  },
  { name: "default export", code: `${importRoot} export default App; ${renderRoot}`, filename: "src/main.tsx" },
  { name: "re-export", code: `${importRoot} export * from "./App"; ${renderRoot}`, filename: "src/main.tsx" },
  { name: "export assignment", code: `${importRoot} export = App; ${renderRoot}`, filename: "src/main.tsx" },
  {
    name: "local component function",
    code: `${importRoot} function App() { return <View />; } ${renderRoot}`,
    filename: "src/main.tsx",
  },
  { name: "local component class", code: `${importRoot} class App {} ${renderRoot}`, filename: "src/main.tsx" },
  {
    name: "local component arrow",
    code: `${importRoot} const App = () => <View />; ${renderRoot}`,
    filename: "src/main.tsx",
  },
  {
    name: "local component expression",
    code: `${importRoot} const App = function() { return <View />; }; ${renderRoot}`,
    filename: "src/main.tsx",
  },
  { name: "local element", code: `${importRoot} const app = <App />; ${renderRoot}`, filename: "src/main.tsx" },
  { name: "local fragment", code: `${importRoot} const app = <><App /></>; ${renderRoot}`, filename: "src/main.tsx" },
  {
    name: "computed render",
    code: `${importRoot} createRoot(container)["render"](<App />);`,
    filename: "src/main.tsx",
  },
  { name: "other method", code: `${importRoot} createRoot(container).mount(<App />);`, filename: "src/main.tsx" },
  {
    name: "multiple render arguments",
    code: `${importRoot} createRoot(container).render(<App />, other);`,
    filename: "src/main.tsx",
  },
  { name: "non-JSX argument", code: `${importRoot} createRoot(container).render(app);`, filename: "src/main.tsx" },
  { name: "unrelated root", code: `${importRoot} other.render(<App />);`, filename: "src/main.tsx" },
  { name: "root creation only", code: `${importRoot} createRoot(container);`, filename: "src/main.tsx" },
])("retains ownership checks for $name", ({ code, filename }) => {
  expect(isReactClientEntrypoint(filename, parse(code, { ecmaFeatures: { jsx: true } }))).toBe(false);
});
