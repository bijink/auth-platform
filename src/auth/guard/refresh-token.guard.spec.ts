import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { JsonWebTokenError, JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon from 'argon2'
import { Request } from 'express'
import authConfig from 'src/auth/config/auth.config'
import { PrismaService } from 'src/prisma/prisma.service'
import { REQUEST_USER_KEY } from './auth.guard'
import { RefreshTokenGuard } from './refresh-token.guard'

jest.mock('argon2')

describe('RefreshTokenGuard', () => {
  let guard: RefreshTokenGuard

  const mockJwtService = { verifyAsync: jest.fn() }
  const mockPrisma = { refreshToken: { findUnique: jest.fn() } }
  const mockAuthConfig = { refreshSecret: 'refresh-test-secret' }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenGuard,
        { provide: JwtService, useValue: mockJwtService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: authConfig.KEY, useValue: mockAuthConfig },
      ],
    }).compile()

    guard = module.get<RefreshTokenGuard>(RefreshTokenGuard)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockContext = (headers: Record<string, string>) => {
    const request = { headers } as unknown as Request
    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext
  }

  it('should throw UnauthorizedException if token missing', async () => {
    const context = mockContext({})
    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token missing'),
    )
  })

  it('should throw UnauthorizedException on token verify JsonWebTokenError', async () => {
    const context = mockContext({ authorization: 'Bearer invalid_rtoken' })
    mockJwtService.verifyAsync.mockRejectedValue(
      new JsonWebTokenError('bad token'),
    )
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    )
  })

  it('should throw UnauthorizedException if refresh token not found in db', async () => {
    const context = mockContext({ authorization: 'Bearer valid_rtoken' })
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, rtid: 'uuid' })
    mockPrisma.refreshToken.findUnique.mockResolvedValue(null)

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token revoked'),
    )
  })

  it('should throw UnauthorizedException if refresh token mismatch', async () => {
    const context = mockContext({ authorization: 'Bearer valid_rtoken' })
    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, rtid: 'uuid' })
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'uuid',
      token: 'hashed',
    })
    ;(argon.verify as jest.Mock).mockResolvedValue(false)

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Token unverified'),
    )
  })

  it('should attach user payload to request and return true on success', async () => {
    const request = {
      headers: { authorization: 'Bearer valid_rtoken' },
    } as unknown as Request
    const context = {
      switchToHttp: jest.fn().mockReturnValue({ getRequest: () => request }),
    } as unknown as ExecutionContext

    mockJwtService.verifyAsync.mockResolvedValue({ sub: 1, rtid: 'uuid' })
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: 'uuid',
      token: 'hashed',
    })
    ;(argon.verify as jest.Mock).mockResolvedValue(true)

    const result = await guard.canActivate(context)
    expect(result).toBe(true)
    expect(
      (request as unknown as Record<string, unknown>)[REQUEST_USER_KEY],
    ).toEqual({ sub: 1, rtid: 'uuid' })
  })
})
