export interface JwtRefreshPayload {
  sub: number
  tokenId: string
  iat: number
  exp: number
}
