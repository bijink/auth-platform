import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Role } from 'generated/prisma/enums'
import { ROLES_KEY } from '../decorator'
import { ActiveUser } from '../interface'
import { REQUEST_USER_KEY } from './auth.guard'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles) return true

    const request: Request = context.switchToHttp().getRequest()
    const user = request[REQUEST_USER_KEY] as ActiveUser

    if (!user?.role) return false

    return requiredRoles.includes(user.role)
  }
}
