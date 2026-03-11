import { ApiProperty, ApiSchema } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

@ApiSchema({ name: 'ForgotPasswordRequest' })
export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty()
  newPassword: string

  @ApiProperty({ example: '019cdba1-96a7-7471-be71-42636407ce41' })
  @IsString()
  @IsNotEmpty()
  emailVerifiedCode: string
}
