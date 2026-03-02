import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { JsonWebTokenError, JwtService, JwtSignOptions } from '@nestjs/jwt'
import * as argon from 'argon2'
import { Prisma, User } from 'generated/prisma/client'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateUserDto } from 'src/user/dto'
import { UserService } from 'src/user/user.service'
import { v7 as uuidv7 } from 'uuid'
import authConfig from './config/auth.config'
import {
  ChangeEmailDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
} from './dto'
import { JwtAccessPayload, JwtRefreshPayload } from './interface'
import { OtpService } from './service'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly otpService: OtpService,
  ) {}

  public async signup(createUserDto: CreateUserDto) {
    const { emailVerifiedCode, ...dto } = createUserDto
    await this.otpService.verifyCode(dto.email, emailVerifiedCode)
    const user = await this.usersService.createUser(dto)
    const tokens = await this.generateTokens(user)
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
    // compare password
    const pwMatches = await argon.verify(user.password, loginDto.password)
    // if the password incorrect, throw exception
    if (!pwMatches) throw new ForbiddenException('Incorrect password')
    // send back the user
    return this.generateTokens(user)
  }

  public async logoutFromAllDevices(userId: number) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      })
      await this.prisma.refreshToken.deleteMany({ where: { userId } })
      return { id: userId, message: 'User logged out from all devices' }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('User not exists')
        }
      }
    }
  }

  public async refreshToken(userId: number, tokenId: string) {
    try {
      // find user from db using userId
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })
      if (!user) throw new UnauthorizedException('User not exists')
      // delete used refresh token from db
      await this.prisma.refreshToken.delete({ where: { id: tokenId } })
      // generate access token and refresh token
      return this.generateTokens(user)
    } catch (error) {
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException(error)
      }
      if (error instanceof UnauthorizedException) throw error
    }
  }

  public async revokeRefreshToken(tokenId: string) {
    await this.prisma.refreshToken.delete({ where: { id: tokenId } })
    return { message: 'Refresh token revoked successfully' }
  }

  public async changeEmail(oldEmail: string, dto: ChangeEmailDto) {
    await this.otpService.verifyCode(
      dto.newEmail,
      dto.newEmailVerifiedCode,
      false,
    )
    await this.otpService.verifyCode(oldEmail, dto.oldEmailVerifiedCode, true)
    const user = await this.prisma.user.update({
      where: { email: oldEmail },
      data: {
        email: dto.newEmail,
        tokenVersion: { increment: 1 },
      },
    })
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } })
    const tokens = await this.generateTokens(user)
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
    const { password: passwordInDb } =
      await this.usersService.findOneUserByEmail(email, false)
    const pwMatches = await argon.verify(passwordInDb, dto.oldPassword)
    if (!pwMatches) throw new BadRequestException('Old password mismatch')
    // generate the password hash
    const hashedNewPassword = await argon.hash(dto.newPassword)
    // update user password
    await this.prisma.user.update({
      where: { email },
      data: { password: hashedNewPassword },
    })

    return { message: 'Changed password successfully' }
  }

  public async forgotPassword(dto: ForgotPasswordDto) {
    // check user exist or not
    const user = await this.usersService.findOneUserByEmail(dto.email)
    // check email is verified or not
    await this.otpService.verifyCode(dto.email, dto.emailVerifiedCode)
    // generate the password hash
    const hashedNewPassword = await argon.hash(dto.newPassword)
    // update user password
    await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: hashedNewPassword },
    })
    // generate tokens
    const tokens = await this.generateTokens(user)

    return {
      message: 'Changed password successfully',
      ...tokens,
    }
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    try {
      // generate access token
      const accessToken = await this.signToken<Partial<JwtAccessPayload>>(
        user.id,
        {
          secret: this.authConfiguration.secret,
          expiresIn: this.authConfiguration.expiresIn,
        },
        {
          email: user.email,
          version: user.tokenVersion,
        },
      )

      // create uuid for refresh token
      const refreshTokenId = uuidv7()
      // generate refresh token
      const refreshToken = await this.signToken<Partial<JwtRefreshPayload>>(
        user.id,
        {
          secret: this.authConfiguration.refreshSecret,
          expiresIn: this.authConfiguration.refreshExpiresIn,
        },
        {
          rtid: refreshTokenId,
        },
      )
      // hash refresh token
      const hashedRefreshToken = await argon.hash(refreshToken)
      // store refresh token in db
      await this.prisma.refreshToken.create({
        data: {
          id: refreshTokenId,
          token: hashedRefreshToken,
          userId: user.id,
        },
      })
      // return access and refresh tokens
      return { accessToken, refreshToken }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  private async signToken<T>(
    sub: number,
    options: JwtSignOptions,
    payload?: T,
  ) {
    return await this.jwtService.signAsync({ sub, ...payload }, options)
  }
}
