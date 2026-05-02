import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request } from 'express'
import { AlsService } from 'src/infra/als/als.service'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly als: AlsService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const store: Map<string, any> = new Map()
    store.set('ip', req.ip)
    store.set('url', req.url)
    store.set('method', req.method)

    this.als.run(store, () => next())
  }
}
