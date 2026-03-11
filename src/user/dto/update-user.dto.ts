import { ApiPropertyOptional, ApiSchema } from '@nestjs/swagger'
import { IsOptional, IsString } from 'class-validator'

@ApiSchema({ name: 'UpdateUserRequest' })
export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsString()
  @IsOptional()
  firstName?: string

  @ApiPropertyOptional({ example: 'Doe' })
  @IsString()
  @IsOptional()
  lastName?: string
}
