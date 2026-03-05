import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Prisma, Role } from 'generated/prisma/client'
import { OtpService } from 'src/otp/otp.service'
import { PrismaService } from 'src/prisma/prisma.service'
import { TokenService } from 'src/token/token.service'
import {
  ChangeUserRoleDto,
  CreateUserDto,
  UpdateUserDto,
  type DeleteUserDto,
} from './dto'
import { UserService } from './user.service'

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
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

describe('UsersService', () => {
  let service: UserService
  let prismaService: typeof mockPrismaService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: OtpService,
          useValue: mockOtpService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
      ],
    }).compile()

    service = module.get<UserService>(UserService)
    prismaService = module.get(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('findAllUsers', () => {
    it('should return all users without passwords', async () => {
      const expectedRes = [
        {
          id: 1,
          email: 'user1@email.com',
          firstName: 'User',
          lastName: 'One',
        },
        {
          id: 2,
          email: 'user2@email.com',
          firstName: 'User',
          lastName: 'Two',
        },
      ]

      prismaService.user.findMany.mockResolvedValue(expectedRes)

      const result = await service.findAllUsers()

      expect(result).toEqual(expectedRes)

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        omit: { password: true },
      })
    })

    it('should return empty array when no users exist', async () => {
      prismaService.user.findMany.mockResolvedValue([])

      const result = await service.findAllUsers()

      expect(result).toEqual([])
      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        omit: { password: true },
      })
    })
  })

  describe('createUser', () => {
    it('should create and return user without password', async () => {
      const dto: Omit<CreateUserDto, 'emailVerifiedCode'> = {
        email: 'test@email.com',
        password: 'pass1234',
        firstName: 'Test',
        lastName: 'User',
      }
      const expectedRes = {
        id: 1,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
      }

      prismaService.user.create.mockResolvedValue(expectedRes)

      const result = await service.createUser(dto)

      expect(result).toEqual(expectedRes)
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          password: expect.any(String) as string, // hashed password
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
        omit: { password: true },
      })
      expect(result).not.toHaveProperty('password')
    })

    it('should throw ConflictException on unique constraint violation (P2002)', async () => {
      const dto: Omit<CreateUserDto, 'emailVerifiedCode'> = {
        email: 'existing@email.com',
        password: 'pass1234',
      }
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: 'test',
        },
      )

      prismaService.user.create.mockRejectedValue(error)

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException)
      await expect(service.createUser(dto)).rejects.toThrow(
        'User with this email already exists',
      )
    })

    it('should throw ConflictException on other Prisma known errors', async () => {
      const dto: Omit<CreateUserDto, 'emailVerifiedCode'> = {
        email: 'test@email.com',
        password: 'pass1234',
      }
      const error = new Prisma.PrismaClientKnownRequestError('Other error', {
        code: 'P2000',
        clientVersion: 'test',
      })

      prismaService.user.create.mockRejectedValue(error)

      await expect(service.createUser(dto)).rejects.toThrow(ConflictException)
      await expect(service.createUser(dto)).rejects.toThrow(
        'Invalid data provided',
      )
    })

    it('should throw InternalServerErrorException on unknown errors', async () => {
      const dto: Omit<CreateUserDto, 'emailVerifiedCode'> = {
        email: 'test@email.com',
        password: 'pass1234',
      }
      const error = new Error('Database connection failed')

      prismaService.user.create.mockRejectedValue(error)

      await expect(service.createUser(dto)).rejects.toThrow(
        InternalServerErrorException,
      )
      await expect(service.createUser(dto)).rejects.toThrow(error)
    })
  })

  describe('findUserByUserId', () => {
    it('should return user when found', async () => {
      const userId = 1
      const expectedRes = {
        id: userId,
        email: 'test@email.com',
        firstName: 'Test',
        lastName: 'User',
      }

      prismaService.user.findUnique.mockResolvedValue(expectedRes)

      const result = await service.findUserByUserId(userId)

      expect(result).toEqual(expectedRes)
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found', async () => {
      const userId = 999

      prismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findUserByUserId(userId)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.findUserByUserId(userId)).rejects.toThrow(
        'User not found',
      )
    })
  })

  describe('findUserByEmail', () => {
    it('should return user when found', async () => {
      const email = 'test@email.com'
      const expectedRes = {
        id: 1,
        email: 'test@email.com',
        firstName: 'Test',
        lastName: 'User',
      }

      prismaService.user.findUnique.mockResolvedValue(expectedRes)

      const result = await service.findUserByEmail(email)

      expect(result).toEqual(expectedRes)
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found', async () => {
      const userId = 999

      prismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findUserByUserId(userId)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.findUserByUserId(userId)).rejects.toThrow(
        'User not found',
      )
    })
  })

  describe('updateUser', () => {
    it('should update and return user', async () => {
      const userId = 1
      const dto: UpdateUserDto = { firstName: 'Updated' }
      const expectedRes = {
        id: userId,
        email: 'test@email.com',
        firstName: 'Updated',
      }

      prismaService.user.update.mockResolvedValue(expectedRes)

      const result = await service.updateUser(userId, dto)

      expect(result).toEqual(expectedRes)
      expect(prismaService.user.update).toHaveBeenCalledWith({
        data: dto,
        where: { id: userId },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found (P2025)', async () => {
      const userId = 999
      const dto: UpdateUserDto = { firstName: 'Updated' }
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: 'test',
        },
      )

      prismaService.user.update.mockRejectedValue(error)

      await expect(service.updateUser(userId, dto)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.updateUser(userId, dto)).rejects.toThrow(
        'User not found',
      )
    })
  })

  describe('softDeleteUser', () => {
    const userEmail = 'test@email.com'
    const deleteUserDto: DeleteUserDto = {
      emailVerifiedCode: 'verification-code',
    }
    it('should soft delete and return status', async () => {
      const expectedRes = {
        id: 1,
        deleted: true,
      }

      prismaService.user.update.mockResolvedValue(expectedRes)

      const result = await service.softDeleteUser(userEmail, deleteUserDto)

      expect(result).toEqual({
        id: expectedRes.id,
        status: true,
        deleted: expectedRes.deleted,
        message: 'Soft deleted user',
      })
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { email: userEmail },
        data: { deleted: true },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found (P2025)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: 'test',
        },
      )

      prismaService.user.update.mockRejectedValue(error)

      await expect(
        service.softDeleteUser(userEmail, deleteUserDto),
      ).rejects.toThrow(NotFoundException)
      await expect(
        service.softDeleteUser(userEmail, deleteUserDto),
      ).rejects.toThrow('User not found')
    })
  })

  describe('hardDeleteUser', () => {
    const userEmail = 'test@email.com'
    const deleteUserDto: DeleteUserDto = {
      emailVerifiedCode: 'verification-code',
    }
    it('should permanently delete and return status', async () => {
      const userId = 1
      const expectedRes = {
        id: userId,
        email: 'test@email.com',
      }

      prismaService.user.delete.mockResolvedValue(expectedRes)

      const result = await service.hardDeleteUser(userEmail, deleteUserDto)

      expect(result).toEqual({
        id: userId,
        status: true,
        message: 'User premanently deleted',
      })
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { email: userEmail },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found (P2025)', async () => {
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: 'test',
        },
      )

      prismaService.user.delete.mockRejectedValue(error)

      await expect(
        service.hardDeleteUser(userEmail, deleteUserDto),
      ).rejects.toThrow(NotFoundException)
      await expect(
        service.hardDeleteUser(userEmail, deleteUserDto),
      ).rejects.toThrow('User not found')
    })
  })

  describe('changeUserRole', () => {
    const dto: ChangeUserRoleDto = {
      role: Role.ADMIN,
    }
    it('should change user role and increment tokenVersion', async () => {
      const userId = 1

      prismaService.user.findUnique.mockResolvedValue({
        role: 'USER',
      })

      prismaService.user.update.mockResolvedValue({
        id: userId,
        role: 'ADMIN',
        email: 'test@email.com',
      })

      const result = await service.changeUserRole(userId, dto)

      expect(result).toEqual({
        id: userId,
        role: 'ADMIN',
        email: 'test@email.com',
        message: "User role changed from 'USER' to 'ADMIN'",
      })

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: { role: true },
      })

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          role: 'ADMIN',
          tokenVersion: { increment: 1 },
        },
        select: { id: true, role: true, email: true },
      })
    })

    it('should throw NotFoundException if user does not exist', async () => {
      const userId = 999

      prismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.changeUserRole(userId, dto)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.changeUserRole(userId, dto)).rejects.toThrow(
        'User not found',
      )
    })

    it('should throw ForbiddenException if user is SUPER_ADMIN', async () => {
      const userId = 1

      prismaService.user.findUnique.mockResolvedValue({
        role: 'SUPER_ADMIN',
      })

      await expect(service.changeUserRole(userId, dto)).rejects.toThrow(
        ForbiddenException,
      )
      await expect(service.changeUserRole(userId, dto)).rejects.toThrow(
        'Cannot change role of a SUPER_ADMIN',
      )
    })

    it('should throw ForbiddenException if role is already the same', async () => {
      const userId = 1

      prismaService.user.findUnique.mockResolvedValue({
        role: 'ADMIN',
      })

      await expect(service.changeUserRole(userId, dto)).rejects.toThrow(
        ForbiddenException,
      )
      await expect(service.changeUserRole(userId, dto)).rejects.toThrow(
        "User role is 'ADMIN' already",
      )
    })
  })
})
