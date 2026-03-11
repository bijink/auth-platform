import { ApiProperty, ApiSchema } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

@ApiSchema({ name: 'DeleteUserRequest' })
export class DeleteUserDto {
  @ApiProperty({ example: '019cdba1-96a7-7471-be71-42636407ce41' })
  @IsString()
  @IsNotEmpty()
  emailVerifiedCode: string
}
