import { AlsService } from '../als/als.service'

export function getAuditContext(als: AlsService) {
  const store = als.getStore()

  return {
    userId: store?.get('userId') as number | undefined,
    userEmail: store?.get('userEmail') as string | undefined,
    ipAddress: store?.get('ip') as string | undefined,
    url: store?.get('url') as string | undefined,
    method: store?.get('method') as string | undefined,
  }
}
