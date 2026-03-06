import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request } from 'express'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from 'generated/prisma/enums'
import { REQUEST_USER_KEY } from './auth.guard'
import { RolesGuard } from './roles.guard'

describe('RolesGuard', () => {
  let guard: RolesGuard

  const mockReflector = { getAllAndOverride: jest.fn() }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesGuard, { provide: Reflector, useValue: mockReflector }],
    }).compile()

    guard = module.get<RolesGuard>(RolesGuard)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockContext = (user: Record<string, unknown>) => {
    const request = { [REQUEST_USER_KEY]: user } as unknown as Request
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({ getRequest: () => request }),
    } as unknown as ExecutionContext
  }

  it('should return true if no roles required', () => {
    mockReflector.getAllAndOverride.mockReturnValue(undefined)
    const context = mockContext({})

    expect(guard.canActivate(context)).toBe(true)
  })

  it('should return false if roles required but user has no role defined', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN])
    const context = mockContext({}) // no role in user

    expect(guard.canActivate(context)).toBe(false)
  })

  it('should return false if user does not have the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN])
    const context = mockContext({ role: Role.USER })

    expect(guard.canActivate(context)).toBe(false)
  })

  it('should return true if user has the required role', () => {
    mockReflector.getAllAndOverride.mockReturnValue([Role.ADMIN, Role.USER])
    const context = mockContext({ role: Role.ADMIN })

    expect(guard.canActivate(context)).toBe(true)
  })
})
