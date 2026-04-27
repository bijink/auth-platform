import { ApiProperty, ApiSchema } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

@ApiSchema({ name: 'ReactivateUserRequest' })
export class ReactivateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string

  @ApiProperty({ example: '019cdba1-96a7-7471-be71-42636407ce41' })
  @IsString()
  @IsNotEmpty()
  emailVerifiedCode: string
}
