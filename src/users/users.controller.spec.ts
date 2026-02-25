import { NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

const mockUsersService = {
  createUser: jest.fn(),
  findUser: jest.fn(),
  updateUser: jest.fn(),
  softDeleteUser: jest.fn(),
  hardDeleteUser: jest.fn(),
}

describe('UsersController', () => {
  let controller: UsersController
  let usersService: typeof mockUsersService

  beforeEach(async () => {
    jest.clearAllMocks()

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile()

    controller = module.get<UsersController>(UsersController)
    usersService = module.get(UsersService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  // describe('createUser', () => {
  //   it('create user then return created user', async () => {
  //     const dto = { email: 'test@email.com', password: 'pass1234' }
  //     const expectedRes = { id: 1 }

  //     usersService.createUser.mockResolvedValue(expectedRes)

  //     await expect(controller.createUser(dto)).resolves.toBe(expectedRes)
  //     expect(usersService.createUser).toHaveBeenCalledWith(dto)
  //   })

  //   it('propagates HttpException from service', async () => {
  //     const dto = { email: 'test@email.com', password: 'pass1234' }
  //     const expectedErr = new ConflictException()

  //     usersService.createUser.mockRejectedValue(expectedErr)

  //     await expect(controller.createUser(dto)).rejects.toBe(expectedErr)
  //   })
  // })

  describe('getUser', () => {
    it('return found user', async () => {
      const expectedRes = { id: 1 }

      usersService.findUser.mockResolvedValue(expectedRes)

      await expect(controller.getUser(1)).resolves.toBe(expectedRes)
      expect(usersService.findUser).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      usersService.findUser.mockRejectedValue(expectedErr)

      await expect(controller.getUser(1)).rejects.toBe(expectedErr)
    })
  })

  describe('updateUser', () => {
    const dto = { firstName: 'tester' }
    it('return updated user', async () => {
      const expectedRes = { id: 1 }

      usersService.updateUser.mockResolvedValue(expectedRes)

      await expect(controller.updateUser(1, dto)).resolves.toBe(expectedRes)
      expect(usersService.updateUser).toHaveBeenCalledWith(1, dto)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      usersService.updateUser.mockRejectedValue(expectedErr)

      await expect(controller.updateUser(2, dto)).rejects.toBe(expectedErr)
    })
  })

  describe('deleteUser (soft)', () => {
    it('return delete status', async () => {
      const expectedRes = { id: 1 }

      usersService.softDeleteUser.mockResolvedValue(expectedRes)

      await expect(controller.deleteUser(1)).resolves.toBe(expectedRes)
      expect(usersService.softDeleteUser).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      usersService.softDeleteUser.mockRejectedValue(expectedErr)

      await expect(controller.deleteUser(1)).rejects.toBe(expectedErr)
    })
  })

  describe('deleteUser (hard)', () => {
    it('return delete status', async () => {
      const expectedRes = { id: 1 }

      usersService.hardDeleteUser.mockResolvedValue(expectedRes)

      await expect(controller.hardDeleteUser(1)).resolves.toBe(expectedRes)
      expect(usersService.hardDeleteUser).toHaveBeenCalledWith(1)
    })

    it('propagates HttpException from service', async () => {
      const expectedErr = new NotFoundException()

      usersService.hardDeleteUser.mockRejectedValue(expectedErr)

      await expect(controller.hardDeleteUser(1)).rejects.toBe(expectedErr)
    })
  })
})
