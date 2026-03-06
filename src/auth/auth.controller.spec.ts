import { Test, TestingModule } from '@nestjs/testing'
import { OtpService } from 'src/otp/otp.service'
import { TokenService } from 'src/token/token.service'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RefreshTokenGuard } from './guard'

describe('AuthController', () => {
  let controller: AuthController

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
    logoutFromAllDevices: jest.fn(),
    changeEmail: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
  }

  const mockOtpService = {
    emailOtp: jest.fn(),
    verifyOtp: jest.fn(),
  }

  const mockTokenService = {
    refreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: OtpService, useValue: mockOtpService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    })
      .overrideGuard(RefreshTokenGuard)
      .useValue({ canActivate: () => true })
      .compile()

    controller = module.get<AuthController>(AuthController)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('signup', () => {
    it('should invoke authService.signup and return result', async () => {
      const dto = {
        email: 'test@t.com',
        password: 'password',
        firstName: 't',
        lastName: 't',
        emailVerifiedCode: 'code',
      }
      mockAuthService.signup.mockResolvedValue({ id: 1 })
      await expect(controller.signup(dto)).resolves.toEqual({ id: 1 })
      expect(mockAuthService.signup).toHaveBeenCalledWith(dto)
    })
  })

  describe('login', () => {
    it('should invoke authService.login and return result', async () => {
      const dto = { email: 'test@t.com', password: 'password' }
      mockAuthService.login.mockResolvedValue({
        accessToken: 'a',
        refreshToken: 'r',
      })
      await expect(controller.login(dto)).resolves.toEqual({
        accessToken: 'a',
        refreshToken: 'r',
      })
      expect(mockAuthService.login).toHaveBeenCalledWith(dto)
    })
  })

  describe('logoutAll', () => {
    it('should invoke authService.logoutFromAllDevices and return result', async () => {
      mockAuthService.logoutFromAllDevices.mockResolvedValue({
        message: 'Success',
      })
      await expect(controller.logoutAll(1)).resolves.toEqual({
        message: 'Success',
      })
      expect(mockAuthService.logoutFromAllDevices).toHaveBeenCalledWith(1)
    })
  })

  describe('refreshToken', () => {
    it('should invoke tokenService.refreshToken and return result', async () => {
      mockTokenService.refreshToken.mockResolvedValue({ accessToken: 'a' })
      await expect(controller.refreshToken(1, 'rtid')).resolves.toEqual({
        accessToken: 'a',
      })
      expect(mockTokenService.refreshToken).toHaveBeenCalledWith(1, 'rtid')
    })
  })

  describe('revokeRefreshToken', () => {
    it('should invoke tokenService.revokeRefreshToken and return result', async () => {
      mockTokenService.revokeRefreshToken.mockResolvedValue({
        message: 'revoked',
      })
      await expect(controller.revokeRefreshToken('rtid')).resolves.toEqual({
        message: 'revoked',
      })
      expect(mockTokenService.revokeRefreshToken).toHaveBeenCalledWith('rtid')
    })
  })

  describe('changeEmail', () => {
    it('should invoke authService.changeEmail and return result', async () => {
      const dto = {
        newEmail: 'new@t.com',
        newEmailVerifiedCode: 'c1',
        oldEmailVerifiedCode: 'c2',
      }
      mockAuthService.changeEmail.mockResolvedValue({ message: 'success' })
      await expect(controller.changeEmail('old@t.com', dto)).resolves.toEqual({
        message: 'success',
      })
      expect(mockAuthService.changeEmail).toHaveBeenCalledWith('old@t.com', dto)
    })
  })

  describe('changePassword', () => {
    it('should invoke authService.changePassword and return result', async () => {
      const dto = {
        oldPassword: 'o',
        newPassword: 'n',
        emailVerifiedCode: 'code',
      }
      mockAuthService.changePassword.mockResolvedValue({ message: 'success' })
      await expect(
        controller.changePassword('test@t.com', dto),
      ).resolves.toEqual({ message: 'success' })
      expect(mockAuthService.changePassword).toHaveBeenCalledWith(
        'test@t.com',
        dto,
      )
    })
  })

  describe('forgotPassword', () => {
    it('should invoke authService.forgotPassword and return result', async () => {
      const dto = {
        email: 'test@t.com',
        newPassword: 'n',
        emailVerifiedCode: 'code',
      }
      mockAuthService.forgotPassword.mockResolvedValue({ message: 'success' })
      await expect(controller.forgotPassword(dto)).resolves.toEqual({
        message: 'success',
      })
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(dto)
    })
  })

  describe('emailOtp', () => {
    it('should invoke otpService.emailOtp and return result', async () => {
      mockOtpService.emailOtp.mockResolvedValue({ message: 'sent' })
      await expect(controller.emailOtp({ email: 't@t.com' })).resolves.toEqual({
        message: 'sent',
      })
      expect(mockOtpService.emailOtp).toHaveBeenCalledWith('t@t.com')
    })
  })

  describe('guardedEmailOtp', () => {
    it('should invoke otpService.emailOtp with guarded=true and return result', async () => {
      mockOtpService.emailOtp.mockResolvedValue({ message: 'sent' })
      await expect(controller.guardedEmailOtp('t@t.com')).resolves.toEqual({
        message: 'sent',
      })
      expect(mockOtpService.emailOtp).toHaveBeenCalledWith('t@t.com', true)
    })
  })

  describe('verifyOtp', () => {
    it('should invoke otpService.verifyOtp and return result', async () => {
      mockOtpService.verifyOtp.mockResolvedValue({ message: 'verified' })
      const dto = { email: 't@t.com', otp: '123456' }
      await expect(controller.verifyOtp(dto)).resolves.toEqual({
        message: 'verified',
      })
      expect(mockOtpService.verifyOtp).toHaveBeenCalledWith(dto)
    })
  })
})
