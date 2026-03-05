export function generateRedisKey(
  domain: string,
  resource: string,
  identifier: string,
): string {
  return `${domain}:${resource}:${identifier}`
}
