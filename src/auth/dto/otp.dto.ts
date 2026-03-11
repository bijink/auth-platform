import { ApiProperty, ApiSchema } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

@ApiSchema({ name: 'EmailOtpRequest' })
export class EmailOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string
}

@ApiSchema({ name: 'VerifyOtpRequest' })
export class VerifyOtpDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string
}
