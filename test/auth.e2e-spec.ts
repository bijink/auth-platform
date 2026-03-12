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
    it('should successfully sign up a new user with valid OTP flow', async () => {
      const email = 'testuser2@example.com'
      const password = 'StrongPassword!123'

      // 1. Request OTP
      const otpRes = await request(app.getHttpServer())
        .post('/auth/email-otp')
        .send({ email })
        .expect(200)

      expect(otpRes.body).toHaveProperty('otp')
      const otp = (otpRes.body as { otp: number }).otp

      // 2. Verify OTP to get verifiedCode
      const verifyRes = await request(app.getHttpServer())
        .post('/auth/verify-otp')
        .send({ email, otp })
        .expect(200)

      expect(verifyRes.body).toHaveProperty('verifiedCode')
      const emailVerifiedCode = (verifyRes.body as { verifiedCode: string })
        .verifiedCode
      // console.log({ email, password, otp, emailVerifiedCode })

      // 3. Signup using the verified code
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email,
          password,
          emailVerifiedCode,
          firstName: 'John',
          lastName: 'Doe',
        })
        .expect(201) // Adjust if signup returns OK

      expect(signupRes.body).toHaveProperty('accessToken')
      expect(signupRes.body).toHaveProperty('refreshToken')

      // 4. Verify user was inserted in DB
      const user = await prisma.user.findUnique({
        where: { email },
      })
      expect(user).toBeDefined()
      expect(user?.email).toBe(email)
      expect(user?.firstName).toBe('John')
    })

    it('should fail to sign up with invalid emailVerifiedCode', async () => {
      const email = 'invaliduser@example.com'
      const password = 'StrongPassword!123'

      const res = await request(app.getHttpServer()).post('/auth/signup').send({
        email,
        password,
        emailVerifiedCode: 'fake-invalid-code',
        firstName: 'Invalid',
        lastName: 'User',
      })

      expect(res.status).toBe(401)
    })
  })
})
