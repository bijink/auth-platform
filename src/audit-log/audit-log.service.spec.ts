import { Test, TestingModule } from '@nestjs/testing'
import type { AuditLog } from 'generated/prisma/client'
import { Paginated } from 'src/common/pagination/interfaces'
import { PaginationProvider } from 'src/common/pagination/pagination.provider'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { AuditLogService } from './audit-log.service'
import { GetAuditLogsQueryDto } from './dto'

describe('AuditLogService', () => {
  let service: AuditLogService
  let prisma: PrismaService
  let paginationProvider: PaginationProvider

  const mockPrismaService = {
    auditLog: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  }

  const mockPaginationProvider = {
    paginateQuery: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PaginationProvider,
          useValue: mockPaginationProvider,
        },
      ],
    }).compile()

    service = module.get<AuditLogService>(AuditLogService)
    prisma = module.get<PrismaService>(PrismaService)
    paginationProvider = module.get<PaginationProvider>(PaginationProvider)
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAllAuditLogs', () => {
    it('should query logs correctly for ADMIN', async () => {
      const dto: GetAuditLogsQueryDto = {
        orderBy: 'createdAt',
        order: 'desc',
      }

      const paginateSpy = jest
        .spyOn(paginationProvider, 'paginateQuery')
        .mockResolvedValue({
          data: [],
          meta: {
            totalCount: 0,
            itemsPerPage: 10,
            totalPages: 0,
            currentPage: 1,
          },
        } as unknown as Paginated<AuditLog>)

      await service.findAllAuditLogs('ADMIN', dto)

      expect(paginateSpy).toHaveBeenCalledWith(
        prisma.auditLog,
        dto,
        expect.objectContaining({
          where: expect.objectContaining({
            type: {
              not: 'ERROR',
              contains: undefined,
            },
          }) as Record<string, unknown>,
          orderBy: { createdAt: 'desc' },
        }),
      )
    })

    it('should query logs correctly for SUPER_ADMIN', async () => {
      const dto: GetAuditLogsQueryDto = {
        orderBy: 'type',
        order: 'asc',
        type: 'CREATE',
        userId: '1',
      }

      const paginateSpy = jest
        .spyOn(paginationProvider, 'paginateQuery')
        .mockResolvedValue({
          data: [],
          meta: {
            totalCount: 0,
            itemsPerPage: 10,
            totalPages: 0,
            currentPage: 1,
          },
        } as unknown as Paginated<AuditLog>)

      await service.findAllAuditLogs('SUPER_ADMIN', dto)

      expect(paginateSpy).toHaveBeenCalledWith(
        prisma.auditLog,
        dto,
        expect.objectContaining({
          where: expect.objectContaining({
            type: {
              not: undefined,
              contains: 'CREATE',
            },
            userId: '1',
          }) as Record<string, unknown>,
          orderBy: { type: 'asc' },
        }),
      )
    })
  })
})
