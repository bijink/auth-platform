import { ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional } from 'class-validator'
import { PaginationQueryDto } from 'src/common/pagination/dto'

export class GetAuditLogsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    example: 'createdAt',
    description: 'Field to order by',
  })
  @IsOptional()
  @IsIn(['createdAt', 'type', 'requestUrl', 'requestMethod'])
  orderBy?: string

  @ApiPropertyOptional({
    example: 'desc',
    enum: ['asc', 'desc'],
    description: 'Order direction',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc'

  @ApiPropertyOptional({
    example: '2024-01-01',
    description: 'From date',
  })
  @IsOptional()
  @IsDateString()
  from?: string

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'To date',
  })
  @IsOptional()
  @IsDateString()
  to?: string

  @ApiPropertyOptional({ example: 'CREATE', description: 'Audit log type' })
  @IsOptional()
  @IsIn(['CREATE', 'UPDATE', 'DELETE', 'ERROR'])
  type?: string

  @ApiPropertyOptional({ example: 1, description: 'User ID' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  userId?: string

  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'User email',
  })
  @IsOptional()
  @IsEmail()
  userEmail?: string
}
