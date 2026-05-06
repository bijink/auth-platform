import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { PaginationQueryDto } from './dto'

import type { Request } from 'express'
import type { ModelName } from 'generated/prisma/internal/prismaNamespace'
import type {
  Paginated,
  PaginationOptions,
  PrismaCountArgs,
  PrismaDelegate,
  PrismaFindManyArgs,
} from './interfaces'

@Injectable()
export class PaginationProvider {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * @param delegate - Prisma model delegate (e.g., this.prisma.user)
   * @param paginationQueryDto - Query parameters containing page and limit
   * @param options - Prisma findMany options (where, select, orderBy, etc.)
   */
  async paginateQuery<T, M extends ModelName>(
    delegate: PrismaDelegate<T, PrismaFindManyArgs<M>, PrismaCountArgs<M>>,
    paginationQueryDto: PaginationQueryDto,
    options?: PaginationOptions<M>,
  ): Promise<Paginated<T>> {
    const limit = Math.max(1, Number(paginationQueryDto.limit) || 10)
    const page = Math.max(1, Number(paginationQueryDto.page) || 1)
    const skip = (page - 1) * limit

    // Execute both queries in parallel
    const [data, totalItems] = await Promise.all([
      delegate.findMany({
        ...options,
        skip,
        take: limit,
      } as PrismaFindManyArgs<M>),
      delegate.count({
        where: options ? options.where : undefined,
      } as PrismaCountArgs<M>),
    ])

    const totalPages = Math.ceil(totalItems / limit)

    if (page > totalPages && totalPages > 0) {
      throw new BadRequestException(`Only ${totalPages} page(s) available`)
    }

    return {
      data,
      meta: {
        itemsPerPage: limit,
        totalItems,
        currentPage: page,
        totalPages,
      },
      links: {
        first: this.buildLink(limit, 1),
        last: this.buildLink(limit, totalPages || 1),
        current: this.buildLink(limit, page),
        next: page < totalPages ? this.buildLink(limit, page + 1) : null,
        previous: page > 1 ? this.buildLink(limit, page - 1) : null,
      },
    }
  }

  private buildLink(limit: number, page: number): string {
    const baseUrl = `${this.request.protocol}://${this.request.get('host')}`
    const url = new URL(this.request.originalUrl, baseUrl)

    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('page', page.toString())

    return url.href
  }
}
