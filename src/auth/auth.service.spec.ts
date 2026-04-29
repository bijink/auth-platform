import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon from 'argon2'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { OtpService } from 'src/otp/otp.service'
import { TokenService } from 'src/token/token.service'
import { UserService } from 'src/user/user.service'
import { AuthService } from './auth.service'

jest.mock('argon2')

describe('AuthService', () => {
  let service: AuthService

  const mockUsersService = {
    createUser: jest.fn(),
    findUserByEmail: jest.fn(),
  }

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
  }

  const mockOtpService = {
    verifyCode: jest.fn(),
  }

  const mockTokenService = {
    generateToken: jest.fn(),
    revokeAllToken: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUsersService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile()

    service = module.get<AuthService>(AuthService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('signup', () => {
    it('should verify code, create user, generate token', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      mockUsersService.createUser.mockResolvedValue({ id: 1 })
      mockTokenService.generateToken.mockResolvedValue({ accessToken: 'a' })

      const dto = {
        email: 't@t.com',
        password: 'p',
        firstName: 'f',
        lastName: 'l',
        emailVerifiedCode: 'c',
      }
      const res = await service.signup(dto)

      expect(res).toEqual({ id: 1, accessToken: 'a' })
      expect(mockOtpService.verifyCode).toHaveBeenCalledWith('t@t.com', 'c')
      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        email: 't@t.com',
        password: 'p',
        firstName: 'f',
        lastName: 'l',
      })
    })
  })

  describe('login', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(
        service.login({ email: 't@t.com', password: 'p' }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is soft-deleted', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ deletedAt: new Date() })
      await expect(
        service.login({ email: 't@t.com', password: 'p' }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException if password mismsatch', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        deletedAt: null,
        password: 'hashed',
      })
      ;(argon.verify as jest.Mock).mockResolvedValue(false)
      await expect(
        service.login({ email: 't@t.com', password: 'p' }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('should generate token if successful', async () => {
      const mockUser = { id: 1, deletedAt: null, password: 'hashed' }
      mockPrisma.user.findUnique.mockResolvedValue(mockUser)
      ;(argon.verify as jest.Mock).mockResolvedValue(true)
      mockTokenService.generateToken.mockResolvedValue({ accessToken: 'a' })

      const res = await service.login({ email: 't@t.com', password: 'p' })
      expect(res).toEqual({ accessToken: 'a' })
    })
  })

  describe('logoutFromAllDevices', () => {
    it('should revoke all tokens', async () => {
      mockTokenService.revokeAllToken.mockResolvedValue({})
      const res = await service.logoutFromAllDevices(1)
      expect(res).toEqual({ message: 'User logged out from all devices' })
      expect(mockTokenService.revokeAllToken).toHaveBeenCalledWith(1)
    })
  })

  describe('changeEmail', () => {
    it('should verify codes, update user and revoke all refresh tokens', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({ id: 1, email: 'new@t.com' })
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({})
      mockTokenService.generateToken.mockResolvedValue({ accessToken: 'a' })

      const dto = {
        newEmail: 'new@t.com',
        newEmailVerifiedCode: 'c1',
        oldEmailVerifiedCode: 'c2',
      }
      const res = await service.changeEmail('old@t.com', dto)

      expect(mockOtpService.verifyCode).toHaveBeenCalledWith(
        'new@t.com',
        'c1',
        false,
      )
      expect(mockOtpService.verifyCode).toHaveBeenCalledWith(
        'old@t.com',
        'c2',
        true,
      )
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'old@t.com' },
        data: { email: 'new@t.com', tokenVersion: { increment: 1 } },
      })
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1 },
      })
      expect(res).toEqual({
        oldEmail: 'old@t.com',
        newEmail: 'new@t.com',
        message: 'Email changed successfully',
        info: 'All access token and refresh token are revoked',
        accessToken: 'a',
      })
    })
  })

  describe('changePassword', () => {
    it('should verify code, verify old password, update db with new hashed password', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      mockUsersService.findUserByEmail.mockResolvedValue({
        password: 'oldHashed',
      })
      ;(argon.verify as jest.Mock).mockResolvedValue(true)
      ;(argon.hash as jest.Mock).mockResolvedValue('newHashed')
      mockPrisma.user.update.mockResolvedValue({})

      const dto = {
        oldPassword: 'o',
        newPassword: 'n',
        emailVerifiedCode: 'code',
      }
      const res = await service.changePassword('test@t.com', dto)

      expect(mockOtpService.verifyCode).toHaveBeenCalledWith(
        'test@t.com',
        'code',
        true,
      )
      expect(mockUsersService.findUserByEmail).toHaveBeenCalledWith(
        'test@t.com',
        false,
      )
      expect(argon.verify).toHaveBeenCalledWith('oldHashed', 'o')
      expect(argon.hash).toHaveBeenCalledWith('n')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@t.com' },
        data: { password: 'newHashed' },
      })
      expect(res).toEqual({ message: 'Changed password successfully' })
    })

    it('should throw BadRequestException if old password mismatch', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      mockUsersService.findUserByEmail.mockResolvedValue({
        password: 'oldHashed',
      })
      ;(argon.verify as jest.Mock).mockResolvedValue(false)

      const dto = {
        oldPassword: 'o',
        newPassword: 'n',
        emailVerifiedCode: 'code',
      }
      await expect(service.changePassword('test@t.com', dto)).rejects.toThrow(
        BadRequestException,
      )
    })
  })

  describe('forgotPassword', () => {
    it('should verify user and code, update db and return tokens', async () => {
      mockUsersService.findUserByEmail.mockResolvedValue({ id: 1 })
      mockOtpService.verifyCode.mockResolvedValue(true)
      ;(argon.hash as jest.Mock).mockResolvedValue('newHashed')
      mockPrisma.user.update.mockResolvedValue({})
      mockTokenService.generateToken.mockResolvedValue({ accessToken: 'a' })

      const dto = {
        email: 'test@t.com',
        newPassword: 'n',
        emailVerifiedCode: 'code',
      }
      const res = await service.forgotPassword(dto)

      expect(mockUsersService.findUserByEmail).toHaveBeenCalledWith(
        'test@t.com',
      )
      expect(mockOtpService.verifyCode).toHaveBeenCalledWith(
        'test@t.com',
        'code',
      )
      expect(argon.hash).toHaveBeenCalledWith('n')
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { email: 'test@t.com' },
        data: { password: 'newHashed' },
      })
      expect(mockTokenService.generateToken).toHaveBeenCalledWith({ id: 1 })
      expect(res).toEqual({
        message: 'Changed password successfully',
        accessToken: 'a',
      })
    })
  })
})
