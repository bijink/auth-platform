import { IsEnum } from 'class-validator'
import { Role } from 'generated/prisma/enums'

export class ChangeUserRoleDto {
  @IsEnum(Role)
  role: Role
}
