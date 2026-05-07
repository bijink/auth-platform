import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { auditLogType } from 'src/audit-log/constant'
import { REQUEST_USER_KEY } from 'src/auth/guard'
import { PrismaService } from 'src/infra/prisma/prisma.service'

@Catch() // Leaving this empty catches EVERYTHING
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly prisma: PrismaService) {}
  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const reqUser = request[REQUEST_USER_KEY] as {
      sub: number
      email: string
    }

    let traceId: string | undefined
    const timestamp = new Date().toISOString()
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR
    let originalRes =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error'

    if (typeof originalRes === 'string') originalRes = { error: originalRes }
    if (typeof originalRes === 'object') {
      originalRes = Object.fromEntries(
        Object.entries(originalRes as Record<string, unknown>).filter(
          ([key]) => key !== 'statusCode',
        ),
      )
    }

    const reqContext = {
      requestUrl: request?.url,
      requestMethod: request?.method,
      userIpAddress: request?.ip,
      userId: reqUser?.sub || undefined,
      userEmail: reqUser?.email || undefined,
    }
    const details = {
      ...originalRes,
      // errorCode: 'NOT_FOUND',
      // errorType: 'BUSINESS_ERROR',
      timestamp,
    }

    try {
      const auditLogRes = await this.prisma.auditLog.create({
        data: {
          ...reqContext,
          details,
          type: auditLogType.ERROR,
        },
      })
      traceId = auditLogRes.id
    } catch (auditError) {
      // Log to console if DB is down, so we don't lose the original error
      console.error('Failed to save audit log:', auditError)
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      // errorCode: 'NOT_FOUND',
      // errorType: 'BUSINESS_ERROR',
      errorCode:
        (originalRes as { error: string })?.error?.toUpperCase() || null,
      name: (originalRes as { name: string })?.name || null,
      message: (originalRes as { message: string })?.message || null,
      details: originalRes,
      path: request?.url,
      timestamp,
      traceId,
    })
  }
}
