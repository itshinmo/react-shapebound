export function getRouterBasename(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');

  return trimmed === '' ? '/' : trimmed;
}
