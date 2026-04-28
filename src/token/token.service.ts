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
import authConfig from 'src/auth/config/auth.config'
import { JwtAccessPayload, JwtRefreshPayload } from 'src/auth/interface'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import { v7 as uuidv7 } from 'uuid'

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly authConfiguration: ConfigType<typeof authConfig>,
    private readonly prisma: PrismaService,
  ) {}

  public async generateToken(user: Omit<User, 'password'>): Promise<{
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
      // decode refresh token expiration time from header
      const { exp: rtExp }: { exp: number } =
        this.jwtService.decode(refreshToken)
      // hash refresh token
      const hashedRefreshToken = await argon.hash(refreshToken)
      // store refresh token in db
      await this.prisma.refreshToken.create({
        data: {
          id: refreshTokenId,
          token: hashedRefreshToken,
          userId: user.id,
          expiresAt: new Date(rtExp * 1000),
        },
      })
      // return access and refresh tokens
      return { accessToken, refreshToken }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }

  public async refreshToken(userId: number, tokenId: string) {
    try {
      // find user from db using userId
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      })
      if (!user) throw new NotFoundException('User not exists')
      // check user is not active (deleted)
      if (user.deleted) throw new ForbiddenException('User account is inactive')
      // delete used refresh token from db
      await this.prisma.refreshToken.delete({ where: { id: tokenId } })
      // generate access token and refresh token
      return this.generateToken(user)
    } catch (error) {
      if (error instanceof JsonWebTokenError)
        throw new UnauthorizedException(error)
      throw error
    }
  }

  public async revokeAccessToken(userId: number) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      })
      return { userId, message: 'Access token revoked successfully' }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025')
          throw new NotFoundException('User not exists')
        throw error
      }
    }
  }

  public async revokeRefreshToken(tokenId: string) {
    const { userId, id } = await this.prisma.refreshToken.delete({
      where: { id: tokenId },
    })
    return {
      userId,
      tokenId: id,
      message: 'Refresh token revoked successfully',
    }
  }

  public async revokeAllToken(userId: number) {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          tokenVersion: { increment: 1 },
        },
      })
      await this.prisma.refreshToken.deleteMany({ where: { userId } })
      return { userId, message: 'All tokens revoked successfully' }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025')
          throw new NotFoundException('User not exists')
        throw error
      }
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
