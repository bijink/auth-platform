import { Test, TestingModule } from '@nestjs/testing'
import { AuditLogController } from './audit-log.controller'
import { AuditLogService } from './audit-log.service'
import { GetAuditLogsQueryDto } from './dto'

describe('AuditLogController', () => {
  let controller: AuditLogController

  const mockAuditLogService = {
    findAllAuditLogs: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile()

    controller = module.get<AuditLogController>(AuditLogController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('getAuditLogs', () => {
    it('should call auditLogService.findAllAuditLogs with correct parameters', async () => {
      const userRole = 'ADMIN'
      const dto: GetAuditLogsQueryDto = { page: 1, limit: 10 }

      mockAuditLogService.findAllAuditLogs.mockResolvedValue('result' as any)

      const result = await controller.getAuditLogs(userRole, dto)

      expect(mockAuditLogService.findAllAuditLogs).toHaveBeenCalledWith(
        userRole,
        dto,
      )
      expect(result).toBe('result')
    })
  })
})
