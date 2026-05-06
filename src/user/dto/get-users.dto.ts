import { IsIn, IsOptional } from 'class-validator'
import { PaginationQueryDto } from 'src/common/pagination/dto'

export class GetUsersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['firstName', 'lastName'])
  orderBy?: string

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc'
}
