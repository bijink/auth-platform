import { InjectRedis } from '@nestjs-modules/ioredis'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import * as argon from 'argon2'
import Redis from 'ioredis'
import { v7 as uuidv7 } from 'uuid'
import { VerifyOtpDto } from '../dto'
import { generateOtp, redisKey } from '../util'

const OTP_DIGIT_COUNT = 6
const VERIFIED_EMAIL_REDIS_EX = 900 // 15 minutes
const EMAILED_OTP_REDIS_EX = 180 // 3 minutes

@Injectable()
export class OtpService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  public async emailOtp(email: string, guarded = false) {
    const otp = await this.generateAndCacheOtp(email, guarded)

    return {
      success: 'OTPEmailed',
      otp,
      message: 'Valid for 3 minutes',
      info: 'This is a mocked otp',
    }
  }

  public async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { guarded } = await this.verifyCachedOtp(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    )

    const key = this.verifiedEmailRedisKey(verifyOtpDto.email)
    const emailVerifiedCode = uuidv7()
    await this.redis.hset(key, {
      code: emailVerifiedCode,
      guarded,
    })
    await this.redis.expire(key, VERIFIED_EMAIL_REDIS_EX)

    return {
      success: 'EmailVerified',
      message: 'Email verified successfully',
      verifiedCode: emailVerifiedCode,
    }
  }

  public async verifyCode(email: string, code: string, guarded = false) {
    const key = this.verifiedEmailRedisKey(email)
    const data = await this.redis.hgetall(key)
    if (!data)
      throw new UnauthorizedException('Verified code expired or email mismatch')
    const isGuarded = Number(data.guarded) ? true : false
    if (isGuarded !== guarded) {
      if (guarded)
        throw new UnauthorizedException(
          `Use '/guarded-email-otp' api (instead) to send OTP`,
        )
      else
        throw new UnauthorizedException(
          `Use '/email-otp' api (instead)  to send OTP`,
        )
    }
    if (data.code !== code)
      throw new UnauthorizedException('Verified code mismatch')
    await this.redis.del(key)
    return true
  }

  private async generateAndCacheOtp(
    email: string,
    guarded: boolean,
  ): Promise<string> {
    const key = this.emailedOtpRedisKey(email)
    // generate and hash otp
    const otp = generateOtp(OTP_DIGIT_COUNT)
    const hashedOtp = await argon.hash(otp)
    // set hashed otp and expire time in redis
    await this.redis.hset(key, {
      hash: hashedOtp,
      attempts: 0,
      guarded: guarded ? 1 : 0, // 1 = true, 0 = false
    })
    await this.redis.expire(key, EMAILED_OTP_REDIS_EX)
    return otp
  }

  private async verifyCachedOtp(
    email: string,
    otp: string,
  ): Promise<{ status: boolean; guarded: number }> {
    const key = this.emailedOtpRedisKey(email)
    // fetch data and check existence
    const data = await this.redis.hgetall(key)
    if (!data.hash)
      throw new UnauthorizedException('OTP expired or email mismatch')
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
    if (!isValid) throw new UnauthorizedException('Invalid OTP')
    // success: Clean up and persist
    await this.redis.del(key)

    return { status: true, guarded: Number(data.guarded) }
  }

  private emailedOtpRedisKey(email: string): string {
    return redisKey('otp', 'emailed', email)
  }
  private verifiedEmailRedisKey(email: string): string {
    return redisKey('email', 'verified', email)
  }
}
