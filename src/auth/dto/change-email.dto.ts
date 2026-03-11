import { ApiProperty } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

export class ChangeEmailDto {
  @ApiProperty({ example: 'new_email@example.com' })
  @IsEmail()
  @IsNotEmpty()
  newEmail: string

  @ApiProperty({ example: '019cdba1-96a7-7471-be71-42636407ce41' })
  @IsString()
  @IsNotEmpty()
  oldEmailVerifiedCode: string

  @ApiProperty({ example: '019cdba1-96a7-7471-be71-42636407ce41' })
  @IsString()
  @IsNotEmpty()
  newEmailVerifiedCode: string
}
