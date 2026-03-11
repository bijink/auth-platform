import { ApiProperty, ApiSchema } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

@ApiSchema({ name: 'ChangePasswordRequest' })
export class ChangePasswordDto {
  @ApiProperty({ example: 'oldPassword123' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  newPassword: string

  @ApiProperty({ example: '019cdba1-96a7-7471-be71-42636407ce41' })
  @IsString()
  @IsNotEmpty()
  emailVerifiedCode: string
}
