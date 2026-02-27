import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JsonWebTokenError, JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { PrismaService } from 'src/prisma/prisma.service'
import authConfig from '../config/auth.config'
import { IS_PUBLIC_KEY } from '../decorator/public.decorator'
import { JwtAccessPayload } from '../interface/jwt-access-payload.interface'
import { extractTokenFromHeader } from '../util/extract-token'

export const REQUEST_USER_KEY = 'user'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request: Request = context.switchToHttp().getRequest()
    const token = extractTokenFromHeader(request)
    if (!token) throw new UnauthorizedException('Token missing')

    try {
      // verify jwt token
      const payload: JwtAccessPayload = await this.jwtService.verifyAsync(
        token,
        { secret: this.authConfiguration.secret },
      )

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { email: true, role: true, tokenVersion: true },
      })
      if (!user) throw new UnauthorizedException('User not exists')

      if (user.tokenVersion !== payload.version) {
        throw new UnauthorizedException('Token revoked')
      }

      request[REQUEST_USER_KEY] = {
        sub: payload.sub,
        email: user.email,
        role: user.role,
      }
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException(error)
      }
      if (error instanceof UnauthorizedException) throw error
    }

    return true
  }
}
