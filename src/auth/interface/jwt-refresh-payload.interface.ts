export interface JwtRefreshPayload {
  sub: number
  rtid: string //refreshTokenId
  iat: number
  exp: number
}
