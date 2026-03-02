import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class ChangeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  newEmail: string

  @IsString()
  @IsNotEmpty()
  oldEmailVerificationCode: string

  @IsString()
  @IsNotEmpty()
  newEmailVerificationCode: string
}
