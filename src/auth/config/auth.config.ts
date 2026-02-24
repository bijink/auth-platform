import { registerAs } from '@nestjs/config'

export default registerAs('auth', () => ({
  secret: process.env.JWT_TOKEN_SECRET_KEY,
  tokenExpiresIn: parseInt(process.env.JWT_TOKEN_EXPIRES_IN ?? '3600'),
  refreshTokenExpiresIn: parseInt(
    process.env.JWT_REFRESH_TOKEN_EXPIRES_IN ?? '86400',
  ),
}))
