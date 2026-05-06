import { BadRequestException, Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import type { Request } from 'express'

import { PaginationQueryDto } from './dto'
import { Paginated } from './interfaces'

export interface PrismaDelegate<T, FindManyArgs, CountArgs> {
  findMany(args?: FindManyArgs): Promise<T[]>
  count(args?: CountArgs): Promise<number>
}

@Injectable()
export class PaginationProvider {
  constructor(@Inject(REQUEST) private readonly request: Request) {}

  /**
   * @param delegate - The Prisma model delegate (e.g., this.prisma.user)
   * @param paginationQueryDto - Page and Limit
   * @param options - Prisma FindMany arguments (where, select, omit, etc.)
   */
  async paginateQuery<
    T,
    FindManyArgs extends { skip?: number; take?: number },
    CountArgs extends { where?: unknown },
  >(
    delegate: PrismaDelegate<T, FindManyArgs, CountArgs>,
    paginationQueryDto: PaginationQueryDto,
    options?: Omit<FindManyArgs, 'skip' | 'take'>,
  ): Promise<Paginated<T>> {
    const limit = Number(paginationQueryDto.limit) || 10
    const page = Number(paginationQueryDto.page) || 1
    const skip = (page - 1) * limit

    const where = (
      options && 'where' in options ? options.where : undefined
    ) as CountArgs['where']

    // Execute queries in parallel
    const [data, totalItems] = await Promise.all([
      delegate.findMany({
        ...options,
        skip,
        take: limit,
      } as unknown as FindManyArgs),
      delegate.count({
        where,
      } as unknown as CountArgs),
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
        first: this.getLink(limit, 1),
        last: this.getLink(limit, totalPages || 1),
        current: this.getLink(limit, page),
        next: page < totalPages ? this.getLink(limit, page + 1) : null,
        previous: page > 1 ? this.getLink(limit, page - 1) : null,
      },
    }
  }

  private getLink(limit: number, page: number): string {
    const baseUrl = this.request.protocol + '://' + this.request.get('host')
    const url = new URL(this.request.originalUrl, baseUrl)
    url.searchParams.set('limit', limit.toString())
    url.searchParams.set('page', page.toString())
    return url.href
  }
}

// import { BadRequestException, Inject, Injectable } from '@nestjs/common'
// import { REQUEST } from '@nestjs/core'
// import type { Request } from 'express'
// import { Prisma } from 'generated/prisma/client'
// import { ModelName } from 'generated/prisma/internal/prismaNamespace'
// import { PrismaService } from 'src/infra/prisma/prisma.service'
// import { PaginationQueryDto } from './dto'
// import { Paginated } from './interfaces'

// // Define a union type of all model names available in Prisma
// export type ModelNames =
//   (typeof Prisma.ModelName)[keyof typeof Prisma.ModelName]

// // Define a type for Prisma operations specific to a given model
// type PrismaOperations<ModelName extends ModelNames> =
//   Prisma.TypeMap['model'][ModelName]['operations']

// // Define a type for Prisma findMany arguments specific to a given model
// type PrismaFindManyArgs<ModelName extends ModelNames> =
//   PrismaOperations<ModelName>['findMany']['args']

// // Define a type for pagination options, including model name, query filters, and pagination parameters
// type PaginationOptions<ModelName extends ModelNames> = {
//   // modelName: ModelName // Name of the model to paginate
//   where?: PrismaFindManyArgs<ModelName>['where'] // Filtering conditions for the query
//   omit?: PrismaFindManyArgs<ModelName>['omit']
//   select?: PrismaFindManyArgs<ModelName>['select']
//   orderBy?: PrismaFindManyArgs<ModelName>['orderBy'] // Sorting criteria for the query
//   // page?: string // Page number for pagination
//   // pageSize?: string // Number of items per page for pagination
// }

// @Injectable()
// export class PaginationProvider {
//   constructor(
//     private readonly prisma: PrismaService,
//     @Inject(REQUEST) private readonly request: Request,
//   ) {}

//   async paginateQuery<T, K extends keyof PrismaService>(
//     modelName: ModelName,
//     paginationQueryDto: PaginationQueryDto,
//     options: PaginationOptions<ModelName>,
//   ): Promise<Paginated<T>> {
//     // Use 'any' or a dynamic return type here
//     const limit = paginationQueryDto.limit ?? 10
//     const page = paginationQueryDto.page ?? 1
//     const skip = (page - 1) * limit

//     // 1. FIX: Access the model delegate dynamically from PrismaService
//     // This allows you to call .findMany and .count on the correct table
//     const db = this.prisma[modelName as string]

//     // 2. FIX: Run count and findMany on the dynamic 'db' constant
//     const [data, totalItems] = await Promise.all([
//       db.findMany({
//         ...options,
//         skip,
//         take: limit,
//       }),
//       db.count({
//         where: options.where, // Only where is valid for count
//       }),
//     ])

//     const totalPages = Math.ceil(totalItems / limit)

//     if (page > totalPages && totalPages > 0) {
//       throw new BadRequestException(`Only ${totalPages} page(s) available`)
//     }

//     const nextPage = page === totalPages ? null : page + 1
//     const prevPage = page === 1 ? null : page - 1

//     return {
//       data,
//       meta: {
//         itemsPerPage: limit,
//         totalItems,
//         currentPage: page,
//         totalPages,
//       },
//       links: {
//         first: this.getLink(limit, 1),
//         last: this.getLink(limit, totalPages || 1),
//         current: this.getLink(limit, page),
//         next: nextPage ? this.getLink(limit, nextPage) : null,
//         previous: prevPage ? this.getLink(limit, prevPage) : null,
//       },
//     }
//   }

//   private getLink(limit: number, page: number): string {
//     const baseUrl = this.request.protocol + '://' + this.request.get('host')
//     const url = new URL(this.request.originalUrl, baseUrl)
//     url.searchParams.set('limit', limit.toString())
//     url.searchParams.set('page', page.toString())
//     return url.href
//   }
// }

// import { BadRequestException, Inject, Injectable } from '@nestjs/common'
// import { REQUEST } from '@nestjs/core'
// import type { Request } from 'express'
// import { Prisma } from 'generated/prisma/browser'
// import { PrismaService } from 'src/infra/prisma/prisma.service'
// import { PaginationQueryDto } from './dto'
// import { Paginated } from './interfaces'

// // Define a union type of all model names available in Prisma
// export type ModelNames =
//   (typeof Prisma.ModelName)[keyof typeof Prisma.ModelName]

// // Define a type for Prisma operations specific to a given model
// type PrismaOperations<ModelName extends ModelNames> =
//   Prisma.TypeMap['model'][ModelName]['operations']

// // Define a type for Prisma findMany arguments specific to a given model
// type PrismaFindManyArgs<ModelName extends ModelNames> =
//   PrismaOperations<ModelName>['findMany']['args']

// // Define a type for pagination options, including model name, query filters, and pagination parameters
// type PaginationOptions<ModelName extends ModelNames> = {
//   // modelName: ModelName // Name of the model to paginate
//   where?: PrismaFindManyArgs<ModelName>['where'] // Filtering conditions for the query
//   omit?: PrismaFindManyArgs<ModelName>['omit']
//   select?: PrismaFindManyArgs<ModelName>['select']
//   orderBy?: PrismaFindManyArgs<ModelName>['orderBy'] // Sorting criteria for the query
//   // page?: string // Page number for pagination
//   // pageSize?: string // Number of items per page for pagination
// }

// @Injectable()
// export class PaginationProvider {
//   constructor(
//     private readonly prisma: PrismaService,
//     @Inject(REQUEST) private readonly request: Request,
//   ) {}

//   async paginateQuery<ModelName extends ModelNames>(
//     model: ModelName,
//     //   {
//     //   findMany: (args) => Prisma.PrismaPromise<T[]>
//     //   count: (args) => Prisma.PrismaPromise<T[]>
//     // },
//     paginationQueryDto: PaginationQueryDto,
//     // options: {
//     //   where?: any
//     //   orderBy?: any
//     //   include?: any
//     //   select?: any
//     //   omit?: any
//     // } = {},
//     options: PaginationOptions<ModelName>,
//   ): Promise<Paginated<ModelName>> {
//     const limit = paginationQueryDto.limit ?? 10
//     const page = paginationQueryDto.page ?? 1
//     const skip = (page - 1) * limit

//     await this.prisma.user.findMany({
//       ...options,
//       skip,
//       take: limit,
//     })
//     // Run in parallel (better than sequential like your TypeORM version)
//     const [data, totalItems] = await Promise.all([
//       this.prisma[model as string].findMany({
//         ...options,
//         skip,
//         take: limit,
//       }),
//       model.count({
//         ...options,
//       }),
//     ])

//     const totalPages = Math.ceil(totalItems / limit)

//     if (page > totalPages && totalPages > 0) {
//       throw new BadRequestException(`Only ${totalPages} page(s) available`)
//     }

//     const nextPage = page === totalPages ? null : page + 1
//     const prevPage = page === 1 ? null : page - 1

//     return {
//       data,
//       meta: {
//         itemsPerPage: limit,
//         totalItems,
//         currentPage: page,
//         totalPages,
//       },
//       links: {
//         first: this.getLink(limit, 1),
//         last: this.getLink(limit, totalPages || 1),
//         current: this.getLink(limit, page),
//         next: nextPage ? this.getLink(limit, nextPage) : null,
//         previous: prevPage ? this.getLink(limit, prevPage) : null,
//       },
//     }
//   }

//   private getLink(limit: number, page: number): string {
//     const baseUrl = this.request.protocol + '://' + this.request.get('host')
//     const url = new URL(this.request.originalUrl, baseUrl)

//     url.searchParams.set('limit', limit.toString())
//     url.searchParams.set('page', page.toString())

//     return url.href
//   }
// }

// import { BadRequestException, Inject, Injectable } from '@nestjs/common'
// import { REQUEST } from '@nestjs/core'
// import { FindManyOptions, ObjectLiteral, Repository } from 'typeorm'
// import { PaginationQueryDto } from './dto'
// import { Paginated } from './interfaces'

// import type { Request } from 'express'

// @Injectable()
// export class PaginationProvider {
//   constructor(@Inject(REQUEST) private readonly request: Request) {}

//   async paginateQuery<T extends ObjectLiteral>(
//     repository: Repository<T>,
//     paginationQueryDto: PaginationQueryDto,
//     options: FindManyOptions<T> = {},
//   ): Promise<Paginated<T>> {
//     const limit = paginationQueryDto.limit ?? 10
//     const page = paginationQueryDto.page ?? 1

//     const data = await repository.find({
//       ...options,
//       skip: (page - 1) * limit,
//       take: limit,
//     })

//     const totalItems = await repository.count({ ...options })
//     const totalPages = Math.ceil(totalItems / limit)
//     if (page > totalPages)
//       throw new BadRequestException(`Only ${totalPages} page(s) available`)

//     const nextPage = page === totalPages ? null : page + 1
//     const prevPage = page === 1 ? null : page - 1

//     return {
//       data,
//       meta: {
//         itemsPerPage: limit,
//         totalItems: totalItems,
//         currentPage: page,
//         totalPages: totalPages,
//       },
//       links: {
//         first: this.getLink(limit, 1),
//         last: this.getLink(limit, totalPages),
//         current: this.getLink(limit, page),
//         next: nextPage ? this.getLink(limit, nextPage) : null,
//         previous: prevPage ? this.getLink(limit, prevPage) : null,
//       },
//     }
//   }

//   private getLink(limit: number, page: number): string {
//     const baseUrl = this.request.protocol + '://' + this.request.host
//     const url = new URL(this.request.originalUrl, baseUrl)

//     url.searchParams.set('limit', limit.toString())
//     url.searchParams.set('page', page.toString())

//     return url.href
//   }
// }
