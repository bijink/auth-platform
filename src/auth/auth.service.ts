import {
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
import { CreateUserDto } from 'src/users/dto'
import { UsersService } from 'src/users/users.service'
import { v7 as uuidv7 } from 'uuid'
import authConfig from './config/auth.config'
import { LoginDto } from './dto'
import { JwtAccessPayload, JwtRefreshPayload } from './interface'

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
  ) {}

  public async signup(createUserDto: CreateUserDto) {
    const isEmailVerified = await this.prisma.verifiedEmail.findUnique({
      where: { email: createUserDto.email },
    })
    if (!isEmailVerified) throw new UnauthorizedException('Email not verified')

    const user = await this.usersService.createUser(createUserDto)
    const tokens = await this.generateTokens(user)
    await this.prisma.verifiedEmail.delete({ where: { email: user.email } })

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
