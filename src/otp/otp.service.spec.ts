import { getRedisConnectionToken } from '@nestjs-modules/ioredis'
import { UnauthorizedException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon from 'argon2'
import { OtpService } from './otp.service'
import * as util from './util'

jest.mock('argon2')
jest.mock('./util', () => ({
  generateOtp: jest.fn(() => '123456'),
  generateRedisKey: jest.fn((...args) => args.join(':')),
}))

jest.mock('uuid', () => ({
  v7: jest.fn(() => 'mock-uuid-v7'),
}))

const mockRedis = {
  hset: jest.fn(),
  expire: jest.fn(),
  hgetall: jest.fn(),
  hincrby: jest.fn(),
  del: jest.fn(),
}

describe('OtpService', () => {
  let service: OtpService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OtpService,
        {
          provide: getRedisConnectionToken(),
          useValue: mockRedis,
        },
      ],
    }).compile()

    service = module.get<OtpService>(OtpService)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('emailOtp', () => {
    it('should generate, cache and return otp details', async () => {
      ;(argon.hash as jest.Mock).mockResolvedValue('hashedOtp')
      const result = await service.emailOtp('test@test.com', true)

      expect(util.generateOtp).toHaveBeenCalledWith(6)
      expect(argon.hash).toHaveBeenCalledWith('123456')
      expect(mockRedis.hset).toHaveBeenCalledWith('otp:emailed:test@test.com', {
        hash: 'hashedOtp',
        attempts: 0,
        guarded: 1,
      })
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'otp:emailed:test@test.com',
        180,
      )
      expect(result).toEqual({
        success: 'OTPEmailed',
        otp: '123456',
        message: 'Valid for 3 minutes',
        info: 'This is a mocked otp',
      })
    })

    it('should properly handle non-guarded emailOtp calls', async () => {
      ;(argon.hash as jest.Mock).mockResolvedValue('hashedOtp')
      const result = await service.emailOtp('test@test.com') // guarded is default false

      expect(mockRedis.hset).toHaveBeenCalledWith('otp:emailed:test@test.com', {
        hash: 'hashedOtp',
        attempts: 0,
        guarded: 0,
      })
      expect(result.otp).toBe('123456')
    })
  })

  describe('verifyOtp', () => {
    it('should verify OTP successfully and create email verified token', async () => {
      mockRedis.hgetall.mockResolvedValue({ hash: 'hashedOtp', guarded: '1' })
      mockRedis.hincrby.mockResolvedValue(1)
      ;(argon.verify as jest.Mock).mockResolvedValue(true)

      const result = await service.verifyOtp({
        email: 'test@test.com',
        otp: '123456',
      })

      expect(argon.verify).toHaveBeenCalledWith('hashedOtp', '123456')
      expect(mockRedis.del).toHaveBeenCalledWith('otp:emailed:test@test.com')
      expect(mockRedis.hset).toHaveBeenCalledWith(
        'email:verified:test@test.com',
        { code: 'mock-uuid-v7', guarded: 1 },
      )
      expect(mockRedis.expire).toHaveBeenCalledWith(
        'email:verified:test@test.com',
        900,
      )
      expect(result).toEqual({
        success: 'EmailVerified',
        message: 'Email verified successfully',
        verifiedCode: 'mock-uuid-v7',
      })
    })

    it('should throw UnauthorizedException if OTP has expired or email mismatch', async () => {
      mockRedis.hgetall.mockResolvedValue({}) // No hash means expired

      await expect(
        service.verifyOtp({ email: 'test@test.com', otp: '123456' }),
      ).rejects.toThrow(
        new UnauthorizedException('OTP expired or email mismatch'),
      )
    })

    it('should throw UnauthorizedException if max attempts exceeded', async () => {
      mockRedis.hgetall.mockResolvedValue({ hash: 'hashedOtp', guarded: '1' })
      mockRedis.hincrby.mockResolvedValue(4) // 4 > 3 -> Fail

      await expect(
        service.verifyOtp({ email: 'test@test.com', otp: '123456' }),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Too many attempts. Please request a new OTP.',
        ),
      )
      expect(mockRedis.del).toHaveBeenCalledWith('otp:emailed:test@test.com')
      expect(argon.verify).not.toHaveBeenCalled()
    })

    it('should throw UnauthorizedException if OTP is invalid', async () => {
      mockRedis.hgetall.mockResolvedValue({ hash: 'hashedOtp', guarded: '1' })
      mockRedis.hincrby.mockResolvedValue(1)
      ;(argon.verify as jest.Mock).mockResolvedValue(false) // verify fails

      await expect(
        service.verifyOtp({ email: 'test@test.com', otp: 'wrong' }),
      ).rejects.toThrow(new UnauthorizedException('Invalid OTP'))
    })
  })

  describe('verifyCode', () => {
    it('should throw UnauthorizedException if verified code expired or email mismatch', async () => {
      mockRedis.hgetall.mockResolvedValue({})

      await expect(
        service.verifyCode('test@test.com', 'some-code'),
      ).rejects.toThrow(
        new UnauthorizedException('Verified code expired or email mismatch'),
      )
    })

    it('should throw UnauthorizedException on guarded mismatch (wrong expected api used - guarded)', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'mock-uuid-v7',
        guarded: '0',
      })

      await expect(
        service.verifyCode('test@test.com', 'mock-uuid-v7', true),
      ).rejects.toThrow(
        new UnauthorizedException(
          "Email 'test@test.com' verification failed. Please use '/guarded-email-otp' api to send OTP",
        ),
      )
    })

    it('should throw UnauthorizedException on guarded mismatch (wrong expected api used - unguarded)', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'mock-uuid-v7',
        guarded: '1',
      })

      await expect(
        service.verifyCode('test@test.com', 'mock-uuid-v7', false),
      ).rejects.toThrow(
        new UnauthorizedException(
          "Email 'test@test.com' verification failed. Please use '/email-otp' api to send OTP",
        ),
      )
    })

    it('should throw UnauthorizedException on verified code mismatch', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'mock-uuid-v7',
        guarded: '0',
      })

      await expect(
        service.verifyCode('test@test.com', 'wrong-code'),
      ).rejects.toThrow(new UnauthorizedException('Verified code mismatch'))
    })

    it('should verify code and delete from redis on success', async () => {
      mockRedis.hgetall.mockResolvedValue({
        code: 'mock-uuid-v7',
        guarded: '1',
      })

      const result = await service.verifyCode(
        'test@test.com',
        'mock-uuid-v7',
        true,
      )

      expect(mockRedis.del).toHaveBeenCalledWith('email:verified:test@test.com')
      expect(result).toBe(true)
    })
  })
})
