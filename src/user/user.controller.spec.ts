import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UserController } from './user.controller'
import { UserService } from './user.service'

const mockUsersService = {
  createUser: jest.fn(),
  findUser: jest.fn(),
  updateUser: jest.fn(),
  softDeleteUser: jest.fn(),
  hardDeleteUser: jest.fn(),
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

  describe('getUser', () => {
    it('return found user', async () => {
      const expectedRes = { id: 1 }

      userService.findUser.mockResolvedValue(expectedRes)

      await expect(controller.getUser(1)).resolves.toBe(expectedRes)
      expect(userService.findUser).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.findUser.mockRejectedValue(expectedErr)

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
    it('return delete status', async () => {
      const expectedRes = { id: 1 }

      userService.softDeleteUser.mockResolvedValue(expectedRes)

      await expect(controller.deleteUser(1)).resolves.toBe(expectedRes)
      expect(userService.softDeleteUser).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.softDeleteUser.mockRejectedValue(expectedErr)

      await expect(controller.deleteUser(1)).rejects.toBe(expectedErr)
    })
  })

  describe('deleteUser (hard)', () => {
    it('return delete status', async () => {
      const expectedRes = { id: 1 }

      userService.hardDeleteUser.mockResolvedValue(expectedRes)

      await expect(controller.hardDeleteUser(1)).resolves.toBe(expectedRes)
      expect(userService.hardDeleteUser).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      userService.hardDeleteUser.mockRejectedValue(expectedErr)

      await expect(controller.hardDeleteUser(1)).rejects.toBe(expectedErr)
    })
  })
})
