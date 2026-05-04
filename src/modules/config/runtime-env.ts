export function getEnvOptional(key: string): string | null {
  const value = process.env[key];
  if (!value) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function getEnvRequired(key: string): string {
  const value = getEnvOptional(key);
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }

  return value;
}
