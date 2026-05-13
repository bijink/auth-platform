import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsIn, IsOptional } from 'class-validator'
import { PaginationQueryDto } from 'src/common/pagination/dto'

export class GetUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'firstName',
    description: 'Field to order by',
  })
  @IsOptional()
  @IsIn(['firstName', 'lastName'])
  orderBy?: string

  @ApiPropertyOptional({
    example: 'asc',
    enum: ['asc', 'desc'],
    description: 'Order direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc'
}
