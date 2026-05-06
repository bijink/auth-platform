import { Type } from 'class-transformer'
import { IsOptional, IsPositive } from 'class-validator'

export class PaginationQueryDto {
  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  limit?: number = 10

  @Type(() => Number)
  @IsOptional()
  @IsPositive()
  page?: number = 1
}
