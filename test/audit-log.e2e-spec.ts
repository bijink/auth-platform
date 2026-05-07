import type { INestApplication } from '@nestjs/common'
import { type TestingModule, Test } from '@nestjs/testing'
import { Role } from 'generated/prisma/enums'
import { AppModule } from 'src/app.module'
import { PrismaService } from 'src/infra/prisma/prisma.service'
import request from 'supertest'
import { App } from 'supertest/types'
import { Paginated } from 'src/common/pagination/interfaces'

describe('AuditLogController (e2e)', () => {
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

  describe('GET /audit-logs', () => {
    it('should return audit logs for ADMIN', async () => {
      const { accessToken } = await getTokens('admin@example.com', Role.ADMIN)

      // Create a test audit log
      await prisma.auditLog.create({
        data: {
          type: 'CREATE',
          userId: 1,
          userEmail: 'admin@example.com',
          requestMethod: 'GET',
          requestUrl: '/test',
          userIpAddress: '127.0.0.1',
        },
      })

      const res: { body: Paginated<unknown> } = await request(
        app.getHttpServer(),
      )
        .get('/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBeGreaterThanOrEqual(1)
      expect(res.body.meta).toBeDefined()
    })

    it('should return audit logs for SUPER_ADMIN', async () => {
      const { accessToken } = await getTokens(
        'superadmin@example.com',
        Role.SUPER_ADMIN,
      )

      const res: { body: Paginated<unknown> } = await request(
        app.getHttpServer(),
      )
        .get('/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.meta).toBeDefined()
    })

    it('should filter audit logs by type', async () => {
      const { accessToken } = await getTokens(
        'superadmin-filter@example.com',
        Role.SUPER_ADMIN,
      )

      await prisma.auditLog.create({
        data: {
          type: 'DELETE',
          userId: 1,
          userEmail: 'admin@example.com',
          requestMethod: 'GET',
          requestUrl: '/test',
          userIpAddress: '127.0.0.1',
        },
      })

      const res: { body: Paginated<unknown> } = await request(
        app.getHttpServer(),
      )
        .get('/audit-logs?type=DELETE')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body.data)).toBe(true)
      if (res.body.data.length > 0) {
        expect((res.body.data[0] as Record<string, unknown>).type).toBe(
          'DELETE',
        )
      }
    })

    it('should return 403 for regular USER', async () => {
      const { accessToken } = await getTokens('user@example.com')
      await request(app.getHttpServer())
        .get('/audit-logs')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(403)
    })
  })
})
