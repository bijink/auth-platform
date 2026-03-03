import { IsNotEmpty, IsString } from 'class-validator'

export class ForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  email: string

  @IsString()
  @IsNotEmpty()
  newPassword: string

  @IsString()
  @IsNotEmpty()
  emailVerifiedCode: string
}
