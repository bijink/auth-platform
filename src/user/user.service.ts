import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import * as argon from 'argon2'
import { Prisma } from 'generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { ChangeUserRoleDto, CreateUserDto, UpdateUserDto } from './dto'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAllUsers() {
    return await this.prisma.user.findMany({ omit: { password: true } })
  }

  async createUser(createUserDto: CreateUserDto, omitPassword = true) {
    try {
      // generate the password hash
      const hashedPassword = await argon.hash(createUserDto.password)
      const createdUser = await this.prisma.user.create({
        data: { ...createUserDto, password: hashedPassword },
        omit: { password: omitPassword },
      })
      return createdUser
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

  async findUser(id: number, omitPassword = true) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: omitPassword },
    })
    if (!foundUser) throw new NotFoundException('User not found')
    return foundUser
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto) {
    try {
      return await this.prisma.user.update({
        data: updateUserDto,
        where: { id },
        omit: { password: true },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found')
        }
      }
    }
  }

  async softDeleteUser(id: number) {
    try {
      const deletedUser = await this.prisma.user.update({
        data: { deleted: true },
        where: { id },
        omit: { password: true },
      })
      return {
        id: deletedUser.id,
        status: true,
        deleted: deletedUser.deleted,
        message: 'Soft deleted user',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found')
        }
      }
    }
  }

  async hardDeleteUser(id: number) {
    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id },
        omit: { password: true },
      })
      return {
        id: deletedUser.id,
        status: true,
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

  async changeUserRole(id: number, changeUserRoleDto: ChangeUserRoleDto) {
    // check user exists and current role of the user
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { role: true },
    })
    if (!user) throw new NotFoundException('User not found')
    if (user.role === 'SUPER_ADMIN')
      throw new ForbiddenException('Cannot change role of a SUPER_ADMIN')
    if (user.role === changeUserRoleDto.role)
      throw new ForbiddenException(
        `User role is '${changeUserRoleDto.role}' already`,
      )
    // change user role
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        role: changeUserRoleDto.role,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, role: true, email: true },
    })

    return {
      ...updatedUser,
      message: `User role changed from '${user.role}' to '${changeUserRoleDto.role}'`,
    }
  }
}
