import type { INestApplication } from '@nestjs/common'
import { type TestingModule, Test } from '@nestjs/testing'
import { Role } from 'generated/prisma/enums'
import { AppModule } from 'src/app.module'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import request from 'supertest'
import { App } from 'supertest/types'

describe('UserController (e2e)', () => {
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

  const getTokens = async (email: string, role: Role = Role.USER) => {
    const password = 'StrongPassword!123'
    // 1. Get OTP
    const otpRes: { body: { otp: string } } = await request(app.getHttpServer())
      .post('/auth/email-otp')
      .send({ email })
    const otp = otpRes.body.otp

    // 2. Verify OTP
    const verifyRes: { body: { verifiedCode: string } } = await request(
      app.getHttpServer(),
    )
      .post('/auth/verify-otp')
      .send({ email, otp })
    const emailVerifiedCode = verifyRes.body.verifiedCode

    // 3. Signup
    await request(app.getHttpServer()).post('/auth/signup').send({
      email,
      password,
      emailVerifiedCode,
      firstName: 'Test',
      lastName: 'User',
    })

    // 4. Update role if needed
    if (role !== Role.USER) {
      await prisma.user.update({
        where: { email },
        data: { role },
      })
    }

    // 5. Login
    const loginRes: { body: { accessToken: string; refreshToken: string } } =
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })

    return loginRes.body
  }

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const email = 'me@example.com'
      const { accessToken } = await getTokens(email)

      const res: { body: { email: string } } = await request(
        app.getHttpServer(),
      )
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.email).toBe(email)
      expect(res.body).not.toHaveProperty('password')
    })

    it('should return 401 if not authenticated', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401)
    })

    it('should return 403 if user account is soft-deleted', async () => {
      const email = 'deleted-access@example.com'
      const { accessToken } = await getTokens(email)

      // Soft delete the user
      await prisma.user.update({
        where: { email },
        data: { deleted: true },
      })

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
    })
  })

  describe('GET /users/:id', () => {
    it('should return user by id', async () => {
      const email = 'other@example.com'
      const { accessToken } = await getTokens('requester@example.com')
      await getTokens(email) // create other user
      const otherUser = await prisma.user.findUnique({ where: { email } })

      const res: { body: { email: string } } = await request(
        app.getHttpServer(),
      )
        .get(`/users/${otherUser?.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.email).toBe(email)
    })

    it('should return 404 if user not found', async () => {
      const { accessToken } = await getTokens('requester@example.com')
      await request(app.getHttpServer())
        .get('/users/9999')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })
  })

  describe('PATCH /users', () => {
    it('should update user profile', async () => {
      const { accessToken } = await getTokens('update@example.com')
      const newFirstName = 'UpdatedName'

      const res: { body: { firstName: string } } = await request(
        app.getHttpServer(),
      )
        .patch('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ firstName: newFirstName })
        .expect(200)

      expect(res.body.firstName).toBe(newFirstName)

      const user = await prisma.user.findUnique({
        where: { email: 'update@example.com' },
      })
      expect(user?.firstName).toBe(newFirstName)
    })
  })

  describe('DELETE /users (soft delete)', () => {
    it('should soft delete user', async () => {
      const email = 'delete@example.com'
      const { accessToken } = await getTokens(email)

      // Need OTP for deletion
      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/guarded-email-otp')
        .set('Authorization', `Bearer ${accessToken}`)
      const otp = otpRes.body.otp

      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
      const emailVerifiedCode = verifyRes.body.verifiedCode

      await request(app.getHttpServer())
        .delete('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emailVerifiedCode })
        .expect(200)

      const user = await prisma.user.findUnique({ where: { email } })
      expect(user?.deleted).toBe(true)
    })
  })

  describe('DELETE /users/hard-delete', () => {
    it('should hard delete user', async () => {
      const email = 'harddelete@example.com'
      const { accessToken } = await getTokens(email)

      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/guarded-email-otp')
        .set('Authorization', `Bearer ${accessToken}`)
      const otp = otpRes.body.otp

      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
      const emailVerifiedCode = verifyRes.body.verifiedCode

      await request(app.getHttpServer())
        .delete('/users/hard-delete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ emailVerifiedCode })
        .expect(200)

      const user = await prisma.user.findUnique({ where: { email } })
      expect(user).toBeNull()
    })
  })

  describe('POST /users/reactivate-user', () => {
    it('should reactivate a soft-deleted user and issue tokens', async () => {
      const email = 'reactivate@example.com'
      const password = 'StrongPassword!123'
      const { accessToken: oldAccessToken } = await getTokens(email)

      const otpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/guarded-email-otp')
        .set('Authorization', `Bearer ${oldAccessToken}`)
      const otp = otpRes.body.otp

      const verifyRes: { body: { verifiedCode: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/verify-otp')
        .send({ email, otp })
      const emailVerifiedCode = verifyRes.body.verifiedCode

      await request(app.getHttpServer())
        .delete('/users')
        .set('Authorization', `Bearer ${oldAccessToken}`)
        .send({ emailVerifiedCode })
        .expect(200)

      const reactivationOtpRes: { body: { otp: string } } = await request(
        app.getHttpServer(),
      )
        .post('/auth/email-otp')
        .send({ email })
      const reactivationOtp = reactivationOtpRes.body.otp

      const reactivationVerifyRes: { body: { verifiedCode: string } } =
        await request(app.getHttpServer())
          .post('/auth/verify-otp')
          .send({ email, otp: reactivationOtp })
      const reactivationCode = reactivationVerifyRes.body.verifiedCode

      const res: { body: { accessToken: string; refreshToken: string } } =
        await request(app.getHttpServer())
          .post('/users/reactivate-user')
          .send({ email, password, emailVerifiedCode: reactivationCode })
          .expect(200)

      expect(res.body.accessToken).toBeDefined()
      expect(res.body.refreshToken).toBeDefined()

      const user = await prisma.user.findUnique({ where: { email } })
      expect(user?.deleted).toBe(false)
      expect(user?.deletedAt).toBeNull()
    })

    it('should return 409 when user is already active', async () => {
      const email = 'already-active@example.com'
      const password = 'StrongPassword!123'
      await getTokens(email)

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
        .post('/users/reactivate-user')
        .send({ email, password, emailVerifiedCode })
        .expect(409)
    })
  })

  describe('GET /users (Admin only)', () => {
    it('should return all users for SUPER_ADMIN', async () => {
      const { accessToken } = await getTokens(
        'admin@example.com',
        Role.SUPER_ADMIN,
      )
      await getTokens('user1@example.com')
      await getTokens('user2@example.com')

      const res: { body: { length: string } } = await request(
        app.getHttpServer(),
      )
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(3)
    })

    it('should return 403 for regular USER', async () => {
      const { accessToken } = await getTokens('user@example.com')
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
    })
  })

  describe('PATCH /users/:id/change-role', () => {
    it('should change user role by SUPER_ADMIN', async () => {
      const { accessToken } = await getTokens(
        'superadmin@example.com',
        Role.SUPER_ADMIN,
      )
      const userEmail = 'torolechange@example.com'
      await getTokens(userEmail)
      const targetUser = await prisma.user.findUnique({
        where: { email: userEmail },
      })

      const res: { body: { role: string } } = await request(app.getHttpServer())
        .patch(`/users/${targetUser?.id}/change-role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: Role.ADMIN })
        .expect(200)

      expect(res.body.role).toBe(Role.ADMIN)

      const updatedUser = await prisma.user.findUnique({
        where: { email: userEmail },
      })
      expect(updatedUser?.role).toBe(Role.ADMIN)
    })

    it('should return 403 for non-SUPER_ADMIN', async () => {
      const { accessToken } = await getTokens('admin@example.com', Role.ADMIN)
      const userEmail = 'torolechange2@example.com'
      await getTokens(userEmail)
      const targetUser = await prisma.user.findUnique({
        where: { email: userEmail },
      })

      await request(app.getHttpServer())
        .patch(`/users/${targetUser?.id}/change-role`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ role: Role.SUPER_ADMIN })
        .expect(403)
    })
  })
})
