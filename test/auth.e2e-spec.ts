import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppModule } from 'src/app.module'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import request from 'supertest'
import { App } from 'supertest/types'

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>
  let prisma: PrismaService

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    prisma = app.get(PrismaService)
    await app.init()
  })

  afterEach(async () => {
    await prisma.cleanDb()
    await app.close()
  })

  describe('/auth/signup (POST)', () => {
    const email = 'testuser2@example.com'
    const password = 'StrongPassword!123'
    const firstName = 'John'
    const lastName = 'Doe'

    it('should successfully sign up a new user with valid OTP flow', async () => {
      // 1. Request OTP
      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/email-otp')
        .send({ email })
        .expect(200)
      const otp = otpRes.body.otp

      // 2. Verify OTP to get verifiedCode
      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
        .expect(200)

      const emailVerifiedCode = verifyRes.body.verifiedCode

      // 3. Signup using the verified code
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
          emailVerifiedCode,
          firstName,
          lastName,
        })
        .expect(201)

      expect(signupRes.body).toHaveProperty('accessToken')
      expect(signupRes.body).toHaveProperty('refreshToken')

      // 4. Verify user was inserted in DB
      const user = await prisma.user.findUnique({
        where: { email },
      })
      expect(user).toBeDefined()
      expect(user?.email).toBe(email)
    })

    it('should fail to sign up with invalid emailVerifiedCode', async () => {
      const res = await request(app.getHttpServer()).post('/auth/signup').send({
        email: 'invaliduser@example.com',
        password: 'StrongPassword!123',
        emailVerifiedCode: 'fake-invalid-code',
        firstName: 'Invalid',
        lastName: 'User',
      })

      expect(res.status).toBe(401)
    })
  })

  describe('/auth/login (POST)', () => {
    const email = 'loginuser@example.com'
    const password = 'StrongPassword!123'

    beforeEach(async () => {
      // Create a user first
      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/email-otp')
        .send({ email })
      const otp = otpRes.body.otp
      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
      const emailVerifiedCode = verifyRes.body.verifiedCode
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
          emailVerifiedCode,
          firstName: 'Login',
          lastName: 'User',
        })
        .expect(201)
    })

    it('should login successfully', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
    })

    it('should fail login with wrong password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'WrongPassword' })
        .expect(403)
    })
  })

  describe('Authenticated Endpoints', () => {
    let accessToken: string
    let refreshToken: string
    const email = 'authuser@example.com'
    const password = 'StrongPassword!123'

    beforeEach(async () => {
      // Create and login user
      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/email-otp')
        .send({ email })
      const otp = otpRes.body.otp
      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
      const emailVerifiedCode = verifyRes.body.verifiedCode
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
          emailVerifiedCode,
          firstName: 'Auth',
          lastName: 'User',
        })
        .expect(201)

      const loginRes: { body: { accessToken: string; refreshToken: string } } =
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email, password })
          .expect(200)

      accessToken = loginRes.body.accessToken
      refreshToken = loginRes.body.refreshToken
    })

    it('/auth/logout-all (POST) - should logout from all devices', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout-all')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
    })

    it('/auth/refresh-token (POST) - should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
    })

    it('/auth/revoke-refresh-token (POST) - should revoke refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/revoke-refresh-token')
        .set('Authorization', `Bearer ${refreshToken}`)
        .expect(200)
    })

    it('/auth/guarded-email-otp (POST) - should generate OTP for current user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/guarded-email-otp')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('otp')
    })

    describe('Account Management', () => {
      it('/auth/change-password (PATCH) - should change password', async () => {
        // 1. Get OTP
        const otpRes: { body: { otp: string } } = await request(
          app.getHttpServer(),
        )
          .post('/auth/guarded-email-otp')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
        const otp = otpRes.body.otp

        // 2. Verify OTP
        const verifyRes: { body: { verifiedCode: string } } = await request(
          app.getHttpServer(),
        )
          .post('/auth/verify-otp')
          .send({ email, otp })
          .expect(200)
        const emailVerifiedCode = verifyRes.body.verifiedCode

        // 3. Change password
        await request(app.getHttpServer())
          .patch('/auth/change-password')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            oldPassword: password,
            newPassword: 'NewStrongPassword!123',
            emailVerifiedCode,
          })
          .expect(200)
      })

      it('/auth/change-email (PATCH) - should change email', async () => {
        const newEmail = 'newemail@example.com'

        // 1. Get OTP for old email
        const oldOtpRes: { body: { otp: string } } = await request(
          app.getHttpServer(),
        )
          .post('/auth/guarded-email-otp')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)
        const oldOtp = oldOtpRes.body.otp

        // 2. Verify old email OTP
        const oldVerifyRes: { body: { verifiedCode: string } } = await request(
          app.getHttpServer(),
        )
          .post('/auth/verify-otp')
          .send({ email, otp: oldOtp })
          .expect(200)
        const oldEmailVerifiedCode = oldVerifyRes.body.verifiedCode

        // 3. Get OTP for new email
        const newOtpRes: { body: { otp: string } } = await request(
          app.getHttpServer(),
        )
          .post('/auth/email-otp')
          .send({ email: newEmail })
          .expect(200)
        const newOtp = newOtpRes.body.otp

        // 4. Verify new email OTP
        const newVerifyRes: { body: { verifiedCode: string } } = await request(
          app.getHttpServer(),
        )
          .post('/auth/verify-otp')
          .send({ email: newEmail, otp: newOtp })
          .expect(200)
        const newEmailVerifiedCode = newVerifyRes.body.verifiedCode

        // 5. Change email
        await request(app.getHttpServer())
          .patch('/auth/change-email')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            newEmail,
            oldEmailVerifiedCode,
            newEmailVerifiedCode,
          })
          .expect(200)

        // Verify user updated in DB
        const user = await prisma.user.findUnique({
          where: { email: newEmail },
        })
        expect(user).toBeDefined()
      })
    })

    it('/auth/forgot-password (PATCH) - should reset password', async () => {
      // 1. Get OTP
      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/email-otp')
        .send({ email })
        .expect(200)
      const otp = otpRes.body.otp

      // 2. Verify OTP
      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
        .expect(200)
      const emailVerifiedCode = verifyRes.body.verifiedCode

      // 3. Reset password
      await request(app.getHttpServer())
        .patch('/auth/forgot-password')
        .send({
          email,
          newPassword: 'ResetPassword!123',
          emailVerifiedCode,
        })
        .expect(200)
    })
  })
})
