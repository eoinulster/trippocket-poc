export function envValue(name, suffix) {
  if (process.env[name]) return process.env[name];
  const key = Object.keys(process.env).find(
    (k) => k.startsWith("TRIPPOCKET_") && k.endsWith(suffix),
  );
  return key ? process.env[key] : undefined;
}
export const databaseURL = () => envValue("DATABASE_URL", "CONNECTION_STRING");
export const modelKey = () => envValue("OPENROUTER_API_KEY", "API_KEY");
