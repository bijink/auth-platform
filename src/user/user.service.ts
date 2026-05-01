import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import * as argon from 'argon2'
import { Prisma } from 'generated/prisma/client'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { OtpService } from 'src/otp/otp.service'
import { TokenService } from 'src/token/token.service'
import {
  ChangeUserRoleDto,
  CreateUserDto,
  DeleteUserDto,
  ReactivateUserDto,
  UpdateUserDto,
} from './dto'

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  async findAllUsers() {
    return await this.prisma.user.findMany({ omit: { password: true } })
  }

  async createUser(
    createUserDto: Omit<CreateUserDto, 'emailVerifiedCode'>,
    omitPassword = true,
  ) {
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
      throw new InternalServerErrorException(error)
    }
  }

  async findUserByUserId(id: number, omitPassword = true) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id },
      omit: { password: omitPassword },
    })
    if (!foundUser) throw new NotFoundException('User not found')
    return foundUser
  }

  async findUserByEmail(email: string, omitPassword = true) {
    const foundUser = await this.prisma.user.findUnique({
      where: { email },
      omit: { password: omitPassword },
    })
    if (!foundUser) throw new NotFoundException('User not found')
    return foundUser
  }

  async updateUser(userId: number, updateUserDto: UpdateUserDto) {
    try {
      return await this.prisma.withAudit.user.update({
        data: updateUserDto,
        where: { id: userId },
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

  async softDeleteUser(email: string, dto: DeleteUserDto) {
    try {
      await this.otpService.verifyCode(email, dto.emailVerifiedCode, true)
      const deletedUser = await this.prisma.user.update({
        where: { email },
        data: { deletedAt: new Date() },
        omit: { password: true },
      })
      await this.tokenService.revokeAllToken(deletedUser.id)
      return {
        id: deletedUser.id,
        status: true,
        message: 'Soft deleted user',
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not found')
        }
      }
      throw error
    }
  }

  async reactivateUser(dto: ReactivateUserDto) {
    const foundUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
      omit: { password: true },
    })
    if (!foundUser) throw new NotFoundException('User not found')
    if (!foundUser.deletedAt) throw new ConflictException('User already active')
    await this.otpService.verifyCode(dto.email, dto.emailVerifiedCode)
    const reactivatedUser = await this.prisma.user.update({
      where: { email: dto.email },
      data: { deletedAt: null },
      omit: { password: true },
    })
    const tokens = await this.tokenService.generateToken(reactivatedUser)
    return {
      id: reactivatedUser.id,
      message: 'User reactivated',
      ...tokens,
    }
  }

  async hardDeleteUser(email: string, dto: DeleteUserDto) {
    try {
      await this.otpService.verifyCode(email, dto.emailVerifiedCode, true)
      const deletedUser = await this.prisma.user.delete({
        where: { email },
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
    const updatedUser = await this.prisma.withAudit.user.update({
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
