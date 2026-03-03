export interface JwtAccessPayload {
  sub: number
  email: string
  version: number
  iat: number
  exp: number
}
