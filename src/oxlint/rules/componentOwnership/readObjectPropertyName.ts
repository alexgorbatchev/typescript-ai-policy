import type { ObjectProperty } from "oxc-parser";

export function readObjectPropertyName(property: ObjectProperty): string | null {
  if (!property.computed && property.key.type === "Identifier") return property.key.name;
  return property.key.type === "Literal" && typeof property.key.value === "string" ? property.key.value : null;
}
