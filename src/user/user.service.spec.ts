import {
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Prisma } from 'generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateUserDto, UpdateUserDto } from './dto'
import { UserService } from './user.service'

const mockPrismaService = {
  user: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
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
      ],
    }).compile()

    service = module.get<UserService>(UserService)
    prismaService = module.get(PrismaService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createUser', () => {
    it('should create and return user without password', async () => {
      const dto: CreateUserDto = {
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
      const dto: CreateUserDto = {
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
      const dto: CreateUserDto = {
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
      const dto: CreateUserDto = {
        email: 'test@email.com',
        password: 'pass1234',
      }
      const error = new Error('Database connection failed')

      prismaService.user.create.mockRejectedValue(error)

      await expect(service.createUser(dto)).rejects.toThrow(
        InternalServerErrorException,
      )
      await expect(service.createUser(dto)).rejects.toThrow(
        'Failed to create user',
      )
    })
  })

  describe('findUser', () => {
    it('should return user when found', async () => {
      const userId = 1
      const expectedRes = {
        id: userId,
        email: 'test@email.com',
        firstName: 'Test',
        lastName: 'User',
      }

      prismaService.user.findUnique.mockResolvedValue(expectedRes)

      const result = await service.findUser(userId)

      expect(result).toEqual(expectedRes)
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found', async () => {
      const userId = 999

      prismaService.user.findUnique.mockResolvedValue(null)

      await expect(service.findUser(userId)).rejects.toThrow(NotFoundException)
      await expect(service.findUser(userId)).rejects.toThrow('User not found')
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
    it('should soft delete and return status', async () => {
      const userId = 1
      const expectedRes = {
        id: userId,
        email: 'test@email.com',
        deleted: true,
      }

      prismaService.user.update.mockResolvedValue(expectedRes)

      const result = await service.softDeleteUser(userId)

      expect(result).toEqual({
        id: userId,
        status: true,
        deleted: true,
        message: 'Soft deleted user',
      })
      expect(prismaService.user.update).toHaveBeenCalledWith({
        data: { deleted: true },
        where: { id: userId },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found (P2025)', async () => {
      const userId = 999
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: 'test',
        },
      )

      prismaService.user.update.mockRejectedValue(error)

      await expect(service.softDeleteUser(userId)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.softDeleteUser(userId)).rejects.toThrow(
        'User not found',
      )
    })
  })

  describe('hardDeleteUser', () => {
    it('should permanently delete and return status', async () => {
      const userId = 1
      const expectedRes = {
        id: userId,
        email: 'test@email.com',
      }

      prismaService.user.delete.mockResolvedValue(expectedRes)

      const result = await service.hardDeleteUser(userId)

      expect(result).toEqual({
        id: userId,
        status: true,
        message: 'User premanently deleted',
      })
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: userId },
        omit: { password: true },
      })
    })

    it('should throw NotFoundException when user not found (P2025)', async () => {
      const userId = 999
      const error = new Prisma.PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: 'test',
        },
      )

      prismaService.user.delete.mockRejectedValue(error)

      await expect(service.hardDeleteUser(userId)).rejects.toThrow(
        NotFoundException,
      )
      await expect(service.hardDeleteUser(userId)).rejects.toThrow(
        'User not found',
      )
    })
  })
})
