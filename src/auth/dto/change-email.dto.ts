import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class ChangeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  newEmail: string

  @IsString()
  @IsNotEmpty()
  oldEmailVerifiedCode: string

  @IsString()
  @IsNotEmpty()
  newEmailVerifiedCode: string
}
