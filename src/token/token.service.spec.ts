import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { JsonWebTokenError, JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon from 'argon2'
import { Prisma, type User } from 'generated/prisma/client'
import authConfig from 'src/auth/config/auth.config'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { TokenService } from './token.service'

jest.mock('argon2')
jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

const mockJwtService = {
  signAsync: jest.fn(),
}

const mockAuthConfig = {
  secret: 'access-secret',
  expiresIn: '15m',
  refreshSecret: 'refresh-secret',
  refreshExpiresIn: '7d',
}

const mockPrismaService = {
  refreshToken: {
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

describe('TokenService', () => {
  let service: TokenService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: authConfig.KEY,
          useValue: mockAuthConfig,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile()

    service = module.get<TokenService>(TokenService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('generateToken', () => {
    it('should return access and refresh tokens', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        tokenVersion: 1,
      } as User
      mockJwtService.signAsync
        .mockResolvedValueOnce('mockAccessToken') // first call (access)
        .mockResolvedValueOnce('mockRefreshToken') // second call (refresh)
      ;(argon.hash as jest.Mock).mockResolvedValue('hashedRefreshToken')
      mockPrismaService.refreshToken.create.mockResolvedValue({})

      const result = await service.generateToken(mockUser)

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2)
      expect(argon.hash).toHaveBeenCalledWith('mockRefreshToken')
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-uuid-v7',
          token: 'hashedRefreshToken',
          userId: mockUser.id,
        },
      })
      expect(result).toEqual({
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
      })
    })

    it('should throw InternalServerErrorException on error', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        tokenVersion: 1,
      } as User
      mockJwtService.signAsync.mockRejectedValue(new Error('Mock Error'))

      await expect(service.generateToken(mockUser)).rejects.toThrow(
        InternalServerErrorException,
      )
    })
  })

  describe('refreshToken', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.refreshToken(1, 'mockTokenId')).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should throw ForbiddenException if user is deleted', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        deleted: true,
      })

      await expect(service.refreshToken(1, 'mockTokenId')).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should throw UnauthorizedException on JsonWebTokenError', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 1,
        deleted: false,
      })
      mockPrismaService.refreshToken.delete.mockRejectedValue(
        new JsonWebTokenError('Invalid token'),
      )

      await expect(service.refreshToken(1, 'mockTokenId')).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should delete used refresh token and generate new tokens', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        tokenVersion: 1,
        deleted: false,
      } as User
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser)
      mockPrismaService.refreshToken.delete.mockResolvedValue({})

      const generateTokenSpy = jest
        .spyOn(service, 'generateToken')
        .mockResolvedValue({
          accessToken: 'newAccessToken',
          refreshToken: 'newRefreshToken',
        })

      const result = await service.refreshToken(1, 'mockTokenId')

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'mockTokenId' },
      })
      expect(generateTokenSpy).toHaveBeenCalledWith(mockUser)
      expect(result).toEqual({
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
      })
    })
  })

  describe('revokeAccessToken', () => {
    it('should increment tokenVersion and return success object', async () => {
      mockPrismaService.user.update.mockResolvedValue({})

      const result = await service.revokeAccessToken(1)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { tokenVersion: { increment: 1 } },
      })
      expect(result).toEqual({
        userId: 1,
        message: 'Access token revoked successfully',
      })
    })

    it('should throw NotFoundException if user does not exist on revocation', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2025',
        clientVersion: '1',
      })
      mockPrismaService.user.update.mockRejectedValue(error)

      await expect(service.revokeAccessToken(1)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('revokeRefreshToken', () => {
    it('should delete refresh token and return success object', async () => {
      mockPrismaService.refreshToken.delete.mockResolvedValue({
        userId: 1,
        id: 'mockTokenId',
      })

      const result = await service.revokeRefreshToken('mockTokenId')

      expect(mockPrismaService.refreshToken.delete).toHaveBeenCalledWith({
        where: { id: 'mockTokenId' },
      })
      expect(result).toEqual({
        userId: 1,
        tokenId: 'mockTokenId',
        message: 'Refresh token revoked successfully',
      })
    })
  })

  describe('revokeAllToken', () => {
    it('should increment tokenVersion, delete refresh tokens, and return success object', async () => {
      mockPrismaService.user.update.mockResolvedValue({})
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({})

      const result = await service.revokeAllToken(1)

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { tokenVersion: { increment: 1 } },
      })
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      })
      expect(result).toEqual({
        userId: 1,
        message: 'All tokens revoked successfully',
      })
    })

    it('should throw NotFoundException if user does not exist when revoking all tokens', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2025',
        clientVersion: '1',
      })
      mockPrismaService.user.update.mockRejectedValue(error)

      await expect(service.revokeAllToken(1)).rejects.toThrow(NotFoundException)
    })
  })
})
