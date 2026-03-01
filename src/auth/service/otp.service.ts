import { InjectRedis } from '@nestjs-modules/ioredis'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as argon from 'argon2'
import Redis from 'ioredis'
import { PrismaService } from 'src/prisma/prisma.service'
import { EmailOtpDto, VerifyOtpDto } from '../dto'
import { generateOtp } from '../util'

@Injectable()
export class OtpService {
  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly prisma: PrismaService,
  ) {}

  public async emailOtp(emailOtpDto: EmailOtpDto) {
    // check email already verified. if true cancel otp generate, return success
    const isEmailVerifiedAlready = await this.prisma.verifiedEmail.findUnique({
      where: { email: emailOtpDto.email },
    })
    if (isEmailVerifiedAlready) {
      return { success: 'EmailVerified', message: 'Email verified already' }
    }

    const otp = await this.generateAndCacheOtp(emailOtpDto.email)

    return {
      success: 'OTPEmailed',
      otp,
      message: 'Valid for 3 minutes',
      info: 'This is a mocked otp',
    }
  }

  public async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    // check email already verified. if true cancel otp generate, return success
    const isEmailVerifiedAlready = await this.prisma.verifiedEmail.findUnique({
      where: { email: verifyOtpDto.email },
    })
    if (isEmailVerifiedAlready) {
      return { success: 'EmailVerified', message: 'Email verified already' }
    }

    await this.verifyCachedOtp(verifyOtpDto.email, verifyOtpDto.otp)

    await this.prisma.verifiedEmail.create({
      data: { email: verifyOtpDto.email },
    })

    return {
      success: 'EmailVerified',
      messag: 'Email verified successfully',
    }
  }

  private async generateAndCacheOtp(email: string): Promise<string> {
    const key = this.redisKey(email)
    // generate otp and hash
    const otp = generateOtp(6)
    const hashedOtp = await argon.hash(otp)
    // set hashed otp and expire time in redis
    await this.redis.hmset(key, {
      hash: hashedOtp,
      attempts: 0,
    })
    await this.redis.expire(key, 180) // 3 min expire
    return otp
  }

  private async verifyCachedOtp(email: string, otp: string): Promise<boolean> {
    const key = this.redisKey(email)
    // fetch data and check existence
    const data = await this.redis.hgetall(key)
    if (!data.hash) {
      throw new UnauthorizedException('OTP expired or not generated')
    }
    // increment attempts immediately (Before checking the hash)
    const currentAttempts = await this.redis.hincrby(key, 'attempts', 1)
    // check if they've now exceeded the limit
    if (currentAttempts > 3) {
      await this.redis.del(key)
      throw new UnauthorizedException(
        'Too many attempts. Please request a new OTP.',
      )
    }
    // verify the hash
    const isValid = await argon.verify(data.hash, otp)
    if (!isValid) {
      throw new UnauthorizedException('Invalid OTP')
    }
    // success: Clean up and persist
    await this.redis.del(key)
    return true
  }

  private redisKey(email: string): string {
    return `otp:${email}`
  }
}
