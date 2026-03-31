function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeValue(userValue: unknown, defaultValue: unknown): unknown {
  if (Array.isArray(userValue) && Array.isArray(defaultValue)) {
    return [...userValue, ...defaultValue];
  }

  if (isPlainObject(userValue) && isPlainObject(defaultValue)) {
    const mergedValue: Record<string, unknown> = structuredClone(userValue);

    for (const [key, value] of Object.entries(defaultValue)) {
      if (Object.hasOwn(mergedValue, key)) {
        mergedValue[key] = mergeValue(mergedValue[key], value);
        continue;
      }

      mergedValue[key] = structuredClone(value);
    }

    return mergedValue;
  }

  return structuredClone(defaultValue);
}

/**
 * Deep-merge two config objects with user values applied first and defaults applied last.
 * This preserves all default policy values while still allowing additive user extensions.
 */
export function mergeConfig<TConfig extends Record<string, unknown>>(
  userConfig: TConfig,
  defaultConfig: TConfig,
): TConfig;
export function mergeConfig(userConfig: unknown, defaultConfig: unknown): unknown {
  return mergeValue(structuredClone(userConfig), defaultConfig);
}
