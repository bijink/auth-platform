import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from 'generated/prisma/enums'
import { ChangeUserRoleDto, DeleteUserDto } from './dto'
import { UserController } from './user.controller'
import { UserService } from './user.service'

const mockUsersService = {
  // createUser: jest.fn(),
  findAllUsers: jest.fn(),
  findUserByUserId: jest.fn(),
  updateUser: jest.fn(),
  softDeleteUser: jest.fn(),
  hardDeleteUser: jest.fn(),
  changeUserRole: jest.fn(),
}

describe('UsersController', () => {
  let controller: UserController
  let userService: typeof mockUsersService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUsersService,
        },
      ],
    }).compile()

    controller = module.get<UserController>(UserController)
    userService = module.get(UserService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  // describe('createUser', () => {
  //   it('create user then return created user', async () => {
  //     const dto = { email: 'test@email.com', password: 'pass1234' }
  //     const expectedRes = { id: 1 }

  //     userService.createUser.mockResolvedValue(expectedRes)

  //     await expect(controller.createUser(dto)).resolves.toBe(expectedRes)
  //     expect(userService.createUser).toHaveBeenCalledWith(dto)
  //   })

  //   it('propagates HttpException from service', async () => {
  //     const dto = { email: 'test@email.com', password: 'pass1234' }
  //     const expectedErr = new ConflictException()

  //     userService.createUser.mockRejectedValue(expectedErr)

  //     await expect(controller.createUser(dto)).rejects.toBe(expectedErr)
  //   })
  // })

  describe('getAllUser', () => {
    it('should return users array', async () => {
      const expectedRes = []

      userService.findAllUsers.mockResolvedValue(expectedRes)

      await expect(controller.getAllUsers()).resolves.toBe(expectedRes)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.findAllUsers.mockRejectedValue(expectedErr)

      await expect(controller.getAllUsers()).rejects.toBe(expectedErr)
    })
  })

  describe('getUser', () => {
    it('return found user', async () => {
      const expectedRes = { id: 1 }

      userService.findUserByUserId.mockResolvedValue(expectedRes)

      await expect(controller.getUser(1)).resolves.toBe(expectedRes)
      expect(userService.findUserByUserId).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.findUserByUserId.mockRejectedValue(expectedErr)

      await expect(controller.getUser(1)).rejects.toBe(expectedErr)
    })
  })

  describe('updateUser', () => {
    const dto = { firstName: 'tester' }
    it('return updated user', async () => {
      const expectedRes = { id: 1 }

      userService.updateUser.mockResolvedValue(expectedRes)

      await expect(controller.updateUser(1, dto)).resolves.toBe(expectedRes)
      expect(userService.updateUser).toHaveBeenCalledWith(1, dto)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.updateUser.mockRejectedValue(expectedErr)

      await expect(controller.updateUser(2, dto)).rejects.toBe(expectedErr)
    })
  })

  describe('deleteUser (soft)', () => {
    const userEmail: string = 'test@email.com'
    const deleteUserDto: DeleteUserDto = {
      emailVerifiedCode: 'verification-code',
    }

    it('return delete status', async () => {
      const expectedRes = { id: 1 }

      userService.softDeleteUser.mockResolvedValue(expectedRes)

      await expect(
        controller.deleteUser(userEmail, deleteUserDto),
      ).resolves.toBe(expectedRes)
      expect(userService.softDeleteUser).toHaveBeenCalledWith(
        userEmail,
        deleteUserDto,
      )
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.softDeleteUser.mockRejectedValue(expectedErr)

      await expect(
        controller.deleteUser(userEmail, deleteUserDto),
      ).rejects.toBe(expectedErr)
    })
  })

  describe('deleteUser (hard)', () => {
    const userEmail: string = 'test@email.com'
    const deleteUserDto: DeleteUserDto = {
      emailVerifiedCode: 'verification-code',
    }

    it('return delete status', async () => {
      const expectedRes = { id: 1 }

      userService.hardDeleteUser.mockResolvedValue(expectedRes)

      await expect(
        controller.hardDeleteUser(userEmail, deleteUserDto),
      ).resolves.toBe(expectedRes)
      expect(userService.hardDeleteUser).toHaveBeenCalledWith(
        userEmail,
        deleteUserDto,
      )
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.hardDeleteUser.mockRejectedValue(expectedErr)

      await expect(
        controller.hardDeleteUser(userEmail, deleteUserDto),
      ).rejects.toBe(expectedErr)
    })
  })

  describe('changeUserRole', () => {
    it('should change user role and return response', async () => {
      const userId = 1
      const dto: ChangeUserRoleDto = {
        role: Role.ADMIN,
      }

      const expectedRes = {
        id: userId,
        role: Role.ADMIN,
        email: 'test@email.com',
        message: "User role changed from 'USER' to 'ADMIN'",
      }

      userService.changeUserRole.mockResolvedValue(expectedRes)

      await expect(controller.changeUserRole(userId, dto)).resolves.toBe(
        expectedRes,
      )

      expect(userService.changeUserRole).toHaveBeenCalledWith(userId, dto)
    })

    it('propagates NotFoundException from service', async () => {
      const userId = 999
      const dto: ChangeUserRoleDto = {
        role: Role.ADMIN,
      }

      const expectedErr = new NotFoundException('User not found')

      userService.changeUserRole.mockRejectedValue(expectedErr)

      await expect(controller.changeUserRole(userId, dto)).rejects.toBe(
        expectedErr,
      )
    })

    it('propagates ForbiddenException from service', async () => {
      const userId = 1
      const dto: ChangeUserRoleDto = {
        role: Role.ADMIN,
      }

      const expectedErr = new ForbiddenException(
        'Cannot change role of a SUPER_ADMIN',
      )

      userService.changeUserRole.mockRejectedValue(expectedErr)

      await expect(controller.changeUserRole(userId, dto)).rejects.toBe(
        expectedErr,
      )
    })
  })
})
