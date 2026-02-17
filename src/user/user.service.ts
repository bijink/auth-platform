import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import * as argon from 'argon2'
import { Prisma } from 'generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async createUser(createUserDto: CreateUserDto) {
    try {
      // generate the password hash
      const hashedPassword = await argon.hash(createUserDto.password)
      const { password: _password, ...user } = await this.prisma.user.create({
        data: { ...createUserDto, password: hashedPassword },
      })
      return user
    } catch (error) {
      // 1. handle validation errors (unique/email constraint violation)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // P2002 = unique constraint failed
        if (error.code === 'P2002') {
          throw new ConflictException('User with this email already exists')
        }
        // Fallback for other known request errors
        throw new ConflictException('Invalid data provided')
      }
      // 2. Fallback for everything else (unknown errors, connection issues, etc.)
      throw new InternalServerErrorException('Failed to create user')
    }
  }

  async findUser(id: number) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id },
    })
    if (!foundUser) throw new NotFoundException('User not found')
    const { password: _password, ...user } = foundUser
    return user
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id },
    })
    if (!foundUser) throw new NotFoundException('User not found')
    return this.prisma.user.update({ data: updateUserDto, where: { id } })
  }

  softDeleteUser(id: number) {
    return id
  }

  async hardDeleteUser(id: number) {
    try {
      const deletedUser = await this.prisma.user.delete({ where: { id } })
      return {
        status: true,
        id: deletedUser.id,
        message: 'User premanently deleted',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found')
        }
      }
    }
  }
}
