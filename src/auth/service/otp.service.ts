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

  private key(email: string) {
    return `otp:${email}`
  }

  async generate(emailOtpDto: EmailOtpDto) {
    // #check email already verified. if true cancel otp generate, return success
    const isEmailVerifiedAlready = await this.prisma.verifiedEmail.findUnique({
      where: { email: emailOtpDto.email },
    })
    if (isEmailVerifiedAlready) {
      return { success: 'EmailVerified', message: 'Email verified already' }
    }

    const key = this.key(emailOtpDto.email)

    const otp = generateOtp(6)
    const hashedOtp = await argon.hash(otp)

    await this.redis.hmset(key, {
      hash: hashedOtp,
      attempts: 0,
    })
    await this.redis.expire(key, 180) // 3 min expire

    return { success: 'OTPEmailed', otp, message: 'Valid for 3 minutes' }
  }

  async verify(verifyOtpDto: VerifyOtpDto) {
    const key = this.key(verifyOtpDto.email)

    const data = await this.redis.hgetall(key)
    if (!data.hash) throw new UnauthorizedException('OTP expired')

    if (Number(data.attempts) >= 3) {
      await this.redis.del(key)
      throw new UnauthorizedException('Too many attempts')
    }

    const isValid = await argon.verify(data.hash, verifyOtpDto.otp)

    if (!isValid) {
      await this.redis.hincrby(key, 'attempts', 1)
      throw new UnauthorizedException('Invalid OTP')
    }

    await this.prisma.verifiedEmail.create({
      data: { email: verifyOtpDto.email },
    })

    await this.redis.del(key)

    return {
      success: 'EmailVerified',
      messag: 'Email verified successfully',
    }
  }
}
