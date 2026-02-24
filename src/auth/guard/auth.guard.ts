import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import authConfig from '../config/auth.config'
import { IS_PUBLIC_KEY } from '../decorator/public.decorator'
import { ActiveUser } from '../interface/active-user.interface'

export const REQUEST_USER_KEY = 'user'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,

    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (isPublic) return true

    const request: Request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request)
    if (!token) throw new UnauthorizedException()
    try {
      const payload: ActiveUser = await this.jwtService.verifyAsync(
        token,
        this.authConfiguration,
      )
      request[REQUEST_USER_KEY] = payload
    } catch {
      throw new UnauthorizedException()
    }
    return true
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? []
    return type === 'Bearer' ? token : undefined
  }
}
