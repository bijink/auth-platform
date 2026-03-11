import { ApiProperty } from '@nestjs/swagger'
import { IsEnum } from 'class-validator'
import { Role } from 'generated/prisma/enums'

export class ChangeUserRoleDto {
  @ApiProperty({ enum: Role, enumName: 'Role', example: Role.USER })
  @IsEnum(Role)
  role: Role
}
