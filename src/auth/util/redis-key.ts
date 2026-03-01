export function redisKey(
  domain: string,
  resource: string,
  identifier: string,
): string {
  return `${domain}:${resource}:${identifier}`
}
