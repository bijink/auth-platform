import { Type } from 'class-transformer'
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional } from 'class-validator'
import { PaginationQueryDto } from 'src/common/pagination/dto'

export class GetAuditLogsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['createdAt', 'type', 'requestUrl', 'requestMethod'])
  orderBy?: string

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc'

  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'DELETE', 'ERROR'])
  type?: string

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  userId?: string

  @IsOptional()
  @IsEmail()
  userEmail?: string
}
