import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon from 'argon2'
import { Prisma } from 'generated/prisma/client'
import { Role } from 'generated/prisma/enums'
import { OtpService } from 'src/otp/otp.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { TokenService } from 'src/token/token.service'
import { UserService } from './user.service'

jest.mock('argon2')

describe('UserService', () => {
  let service: UserService

  const mockPrisma = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }

  const mockOtpService = {
    verifyCode: jest.fn(),
  }

  const mockTokenService = {
    revokeAllToken: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAllUsers', () => {
    it('should return all users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([{ id: 1 }])
      const result = await service.findAllUsers()
      expect(result).toEqual([{ id: 1 }])
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        omit: { password: true },
      })
    })
  })

  describe('createUser', () => {
    it('should create and return user without password', async () => {
      ;(argon.hash as jest.Mock).mockResolvedValue('hashed_password')
      mockPrisma.user.create.mockResolvedValue({ id: 1, email: 'test@t.com' })
      const result = await service.createUser({
        email: 'test@t.com',
        password: 'password',
        firstName: 't',
        lastName: 't',
      })
      expect(result).toEqual({ id: 1, email: 'test@t.com' })
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@t.com',
          password: 'hashed_password',
          firstName: 't',
          lastName: 't',
        },
        omit: { password: true },
      })
    })

    it('should throw ConflictException on Prisma P2002 error', async () => {
      ;(argon.hash as jest.Mock).mockResolvedValue('hashed_password')
      const err = new Prisma.PrismaClientKnownRequestError('Error', {
        code: 'P2002',
        clientVersion: '1',
      })
      mockPrisma.user.create.mockRejectedValue(err)
      await expect(
        service.createUser({
          email: 'test@t.com',
          password: 'password',
          firstName: 't',
          lastName: 't',
        }),
      ).rejects.toThrow(ConflictException)
    })
  })

  describe('findUserByUserId', () => {
    it('should return found user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 })
      await expect(service.findUserByUserId(1)).resolves.toEqual({ id: 1 })
    })

    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(service.findUserByUserId(1)).rejects.toThrow(
        NotFoundException,
      )
    })
  })

  describe('findUserByEmail', () => {
    it('should return found user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1 })
      await expect(service.findUserByEmail('t@t.com')).resolves.toEqual({
        id: 1,
      })
    })
  })

  describe('updateUser', () => {
    it('should return updated user', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 1, firstName: 'A' })
      await expect(service.updateUser(1, { firstName: 'A' })).resolves.toEqual({
        id: 1,
        firstName: 'A',
      })
    })
  })

  describe('softDeleteUser', () => {
    it('should soft delete user and revoke token', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      mockPrisma.user.update.mockResolvedValue({ id: 1, deleted: true })
      mockTokenService.revokeAllToken.mockResolvedValue({})

      const result = await service.softDeleteUser('t@t.com', {
        emailVerifiedCode: 'code',
      })
      expect(result).toEqual({
        id: 1,
        status: true,
        deleted: true,
        message: 'Soft deleted user',
      })
      expect(mockTokenService.revokeAllToken).toHaveBeenCalledWith(1)
    })

    it('should throw NotFoundException on P2025 error', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      const err = new Prisma.PrismaClientKnownRequestError('', {
        code: 'P2025',
        clientVersion: '1',
      })
      mockPrisma.user.update.mockRejectedValue(err)

      await expect(
        service.softDeleteUser('t@t.com', { emailVerifiedCode: 'code' }),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('hardDeleteUser', () => {
    it('should completely delete user and revoke token', async () => {
      mockOtpService.verifyCode.mockResolvedValue(true)
      mockPrisma.user.delete.mockResolvedValue({ id: 1 })
      mockTokenService.revokeAllToken.mockResolvedValue({})

      const result = await service.hardDeleteUser('t@t.com', {
        emailVerifiedCode: 'code',
      })
      expect(result).toEqual({
        id: 1,
        status: true,
        message: 'User premanently deleted',
      })
      expect(mockTokenService.revokeAllToken).toHaveBeenCalledWith(1)
    })
  })

  describe('changeUserRole', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      await expect(
        service.changeUserRole(1, { role: Role.ADMIN }),
      ).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException if user is SUPER_ADMIN', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.SUPER_ADMIN })
      await expect(
        service.changeUserRole(1, { role: Role.ADMIN }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw ForbiddenException if user has the same role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.ADMIN })
      await expect(
        service.changeUserRole(1, { role: Role.ADMIN }),
      ).rejects.toThrow(ForbiddenException)
    })

    it('should change role, increment tokenVersion and return message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ role: Role.USER })
      mockPrisma.user.update.mockResolvedValue({
        id: 1,
        role: Role.ADMIN,
        email: 't@t.com',
      })

      const result = await service.changeUserRole(1, { role: Role.ADMIN })
      expect(result).toEqual({
        id: 1,
        role: Role.ADMIN,
        email: 't@t.com',
        message: "User role changed from 'USER' to 'ADMIN'",
      })
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { role: Role.ADMIN, tokenVersion: { increment: 1 } },
        select: { id: true, role: true, email: true },
      })
    })
  })
})
