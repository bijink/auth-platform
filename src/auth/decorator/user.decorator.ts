import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { REQUEST_USER_KEY } from '../guard/auth.guard'
import { ActiveUser } from '../interface/active-user.interface'

export const User = createParamDecorator(
  (field: keyof ActiveUser | undefined, ctx: ExecutionContext) => {
    const request: Request = ctx.switchToHttp().getRequest()
    const user: ActiveUser = request[REQUEST_USER_KEY] as ActiveUser
    return field ? user?.[field] : user
  },
)
