import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import * as argon from 'argon2'
import { UserAlreadyExistsException } from 'src/custom-exceptions'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { OtpService } from 'src/otp/otp.service'
import { TokenService } from 'src/token/token.service'
import { CreateUserDto } from 'src/user/dto'
import { UserService } from 'src/user/user.service'
import {
  ChangeEmailDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
} from './dto'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  public async signup(createUserDto: CreateUserDto) {
    // validate if a user exists with the same email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
      select: { email: true },
    })
    if (existingUser)
      throw new UserAlreadyExistsException('email', existingUser.email)
    const { emailVerifiedCode, ...dto } = createUserDto
    await this.otpService.verifyCode(dto.email, emailVerifiedCode)
    const user = await this.usersService.createUser(dto)
    const tokens = await this.tokenService.generateToken(user)
    return { ...user, ...tokens }
  }

  public async login(loginDto: LoginDto) {
    // find the user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    })
    // if user does not exist, throw exception
    if (!user) throw new NotFoundException('User not found')
    // check user is not active (soft-deleted)
    if (user.deletedAt) throw new ForbiddenException('User account inactive')
    // compare password
    const pwMatches = await argon.verify(user.password, loginDto.password)
    // if the password incorrect, throw exception
    if (!pwMatches) throw new ForbiddenException('Incorrect password')
    // send back the user
    return this.tokenService.generateToken(user)
  }

  public async logoutFromAllDevices(userId: number) {
    await this.tokenService.revokeAllToken(userId)
    return {
      message: 'User logged out from all devices',
    }
  }

  public async changeEmail(oldEmail: string, dto: ChangeEmailDto) {
    await this.otpService.verifyCode(
      dto.newEmail,
      dto.newEmailVerifiedCode,
      false,
    )
    await this.otpService.verifyCode(oldEmail, dto.oldEmailVerifiedCode, true)
    const user = await this.prisma.withAudit.user.update({
      where: { email: oldEmail },
      data: {
        email: dto.newEmail,
        tokenVersion: { increment: 1 },
      },
    })
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } })
    const tokens = await this.tokenService.generateToken(user)
    return {
      oldEmail,
      newEmail: dto.newEmail,
      message: 'Email changed successfully',
      info: 'All access token and refresh token are revoked',
      ...tokens,
    }
  }

  public async changePassword(email: string, dto: ChangePasswordDto) {
    // check email is verified or not
    await this.otpService.verifyCode(email, dto.emailVerifiedCode, true)
    // check inputed oldPassword matches with the db
    const { password: passwordInDb } = await this.usersService.findUserByEmail(
      email,
      false,
    )
    const pwMatches = await argon.verify(passwordInDb, dto.oldPassword)
    if (!pwMatches) throw new BadRequestException('Old password mismatch')
    // generate the password hash
    const hashedNewPassword = await argon.hash(dto.newPassword)
    // update user password
    await this.prisma.withAudit.user.update({
      where: { email },
      data: { password: hashedNewPassword },
    })

    return { message: 'Changed password successfully' }
  }

  public async forgotPassword(dto: ForgotPasswordDto) {
    // check user exist or not
    const user = await this.usersService.findUserByEmail(dto.email)
    // check email is verified or not
    await this.otpService.verifyCode(dto.email, dto.emailVerifiedCode)
    // generate the password hash
    const hashedNewPassword = await argon.hash(dto.newPassword)
    // update user password
    await this.prisma.withAudit.user.update({
      where: { email: dto.email },
      data: { password: hashedNewPassword },
    })
    // generate tokens
    const tokens = await this.tokenService.generateToken(user)

    return {
      message: 'Changed password successfully',
      ...tokens,
    }
  }
}
