import {
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JsonWebTokenError, JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import { Request } from 'express'
import authConfig from 'src/auth/config/auth.config'
import { IS_PUBLIC_KEY } from 'src/auth/decorator'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { AuthGuard, REQUEST_USER_KEY } from './auth.guard'

describe('AuthGuard', () => {
  let guard: AuthGuard

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  }

  const mockJwtService = {
    verifyAsync: jest.fn(),
  }

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
  }

  const mockAuthConfig = { secret: 'test-secret' }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: Reflector, useValue: mockReflector },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: authConfig.KEY, useValue: mockAuthConfig },
      ],
    }).compile()

    guard = module.get<AuthGuard>(AuthGuard)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockContext = (headers: Record<string, string> = {}) => {
    const request = { headers } as unknown as Request
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext
  }

  it('should be defined', () => {
    expect(guard).toBeDefined()
  })

  it('should return true if route is public', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(true)
    const context = mockContext()

    expect(await guard.canActivate(context)).toBe(true)
    expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      expect.anything(),
    )
  })

  it('should throw UnauthorizedException if token is missing', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false)
    const context = mockContext({}) // no authorization header

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token missing'),
    )
  })

  it('should throw UnauthorizedException if token verification fails with JsonWebTokenError', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false)
    const context = mockContext({ authorization: 'Bearer invalid_token' })
    mockJwtService.verifyAsync.mockRejectedValue(
      new JsonWebTokenError('invalid signature'),
    )

    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('should throw NotFoundException if user is not found', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false)
    const context = mockContext({ authorization: 'Bearer valid_token' })
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, version: 1 })
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(guard.canActivate(context)).rejects.toThrow(
      new NotFoundException('Your account not exists'),
    )
  })

  it('should throw ForbiddenException if user is inactive (soft-deleted)', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false)
    const context = mockContext({ authorization: 'Bearer valid_token' })
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, version: 1 })
    mockPrisma.user.findUnique.mockResolvedValue({ deletedAt: new Date() })

    await expect(guard.canActivate(context)).rejects.toThrow(
      new ForbiddenException('Your account is inactive'),
    )
  })

  it('should throw UnauthorizedException if token version does not match user tokenVersion', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false)
    const context = mockContext({ authorization: 'Bearer valid_token' })
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, version: 1 }) // payload version 1
    mockPrisma.user.findUnique.mockResolvedValue({
      deletedAt: null,
      tokenVersion: 2,
    }) // user version 2

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Access token revoked'),
    )
  })

  it('should attach user payload to request and return true on valid token', async () => {
    mockReflector.getAllAndOverride.mockReturnValue(false)
    const request = {
      headers: { authorization: 'Bearer valid_token' },
    } as unknown as Request
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({ getRequest: () => request }),
    } as unknown as ExecutionContext

    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, version: 1 })
    mockPrisma.user.findUnique.mockResolvedValue({
      email: 'test@test.com',
      role: 'USER',
      tokenVersion: 1,
      deletedAt: null,
    })

    const result = await guard.canActivate(context)

    expect(result).toBe(true)
    expect(
      (request as unknown as Record<string, unknown>)[REQUEST_USER_KEY],
    ).toEqual({
      sub: 1,
      email: 'test@test.com',
      role: 'USER',
    })
  })
})
