import { AlsService } from 'src/infra/als/als.service'

export function getAuditContext(als: AlsService) {
  const store = als.getStore()

  return {
    requestUrl: store?.get('url') as string | undefined,
    requestMethod: store?.get('method') as string | undefined,
    userId: store?.get('userId') as number | undefined,
    userEmail: store?.get('userEmail') as string | undefined,
    userIpAddress: store?.get('ip') as string | undefined,
  }
}
