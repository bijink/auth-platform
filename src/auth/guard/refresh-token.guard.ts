import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { JsonWebTokenError, JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { PrismaService } from 'src/prisma/prisma.service'
import authConfig from '../config/auth.config'

export const REQUEST_USER_KEY = 'user'

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)
    if (!token) throw new UnauthorizedException()

    try {
      const payload: { sub: number } = await this.jwtService.verifyAsync(
        token,
        { secret: this.authConfiguration.secret },
      )

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { role: true, tokenVersion: true },
      })

      if (!user) throw new UnauthorizedException('User not exists')

      // if (user.tokenVersion !== payload.version) {
      //   throw new UnauthorizedException('Token revoked')
      // }

      request[REQUEST_USER_KEY] = {
        sub: payload.sub,
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

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
