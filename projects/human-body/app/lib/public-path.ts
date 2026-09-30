/** A single prefix for static hosting; local/server previews keep root paths. */
export function publicPath(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const prefix = base.replace(/\/$/, "");
  return prefix && !path.startsWith(`${prefix}/`) ? `${prefix}${path}` : path;
}
