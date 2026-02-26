import { registerAs } from '@nestjs/config'
import { JwtSignOptions } from '@nestjs/jwt'

export default registerAs('auth', () => ({
  secret: process.env.JWT_ACCESS_SECRET_KEY,
  expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as JwtSignOptions['expiresIn'],
  refreshSecret: process.env.JWT_REFRESH_SECRET_KEY,
  refreshExpiresIn: process.env
    .JWT_REFRESH_EXPIRES_IN as JwtSignOptions['expiresIn'],
}))
