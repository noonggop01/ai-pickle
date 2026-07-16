// Prefixes an absolute path with the configured base path (e.g. "/ai-pickle"),
// so links keep working whether the site is served from a root domain or a
// GitHub Pages project path.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
