import { ApiProperty, ApiSchema } from '@nestjs/swagger'
import { IsEmail, IsNotEmpty, IsString } from 'class-validator'

@ApiSchema({ name: 'LoginRequest' })
export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email address of the user',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
  })
  @IsString()
  @IsNotEmpty()
  password: string
}
