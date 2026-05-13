import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsOptional, IsPositive } from 'class-validator'

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 10, description: 'Number of items per page' })
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  limit?: number

  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  page?: number
}
