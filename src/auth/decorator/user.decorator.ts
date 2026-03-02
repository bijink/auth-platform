import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common'
import { REQUEST_USER_KEY } from '../guard'
import { ActiveUser } from '../interface'

export const User = createParamDecorator(
  (field: keyof ActiveUser | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest()
    const user: ActiveUser = request[REQUEST_USER_KEY] as ActiveUser
    if (!user) throw new UnauthorizedException('Access token missing')
    return field ? user?.[field] : user
  },
)
