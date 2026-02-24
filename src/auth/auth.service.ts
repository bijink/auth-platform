import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon from 'argon2'
import { User } from 'generated/prisma/browser'
import { PrismaService } from 'src/prisma/prisma.service'
import { CreateUserDto } from 'src/users/dto/create-user.dto'
import { UsersService } from 'src/users/users.service'
import authConfig from './config/auth.config'
import { LoginDto } from './dto/login.dto'
import { ActiveUser } from './interface/active-user.interface'

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
    const user = await this.usersService.createUser(createUserDto)
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

  public refreshToken() {}

  private async generateTokens(user: User): Promise<{
    accessToken: string
    refreshToken: string
  }> {
    // generate an access token
    const accessToken = await this.signToken<Partial<ActiveUser>>(
      user.id,
      this.authConfiguration.tokenExpiresIn,
      { email: user.email, role: user.role },
    )
    // generate a refresh token
    const refreshToken = await this.signToken(
      user.id,
      this.authConfiguration.refreshTokenExpiresIn,
    )

    return {
      accessToken: accessToken,
      refreshToken: refreshToken,
    }
  }

  private async signToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: this.authConfiguration.secret,
        expiresIn,
      },
    )
  }
}
