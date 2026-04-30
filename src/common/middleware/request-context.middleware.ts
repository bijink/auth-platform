import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request } from 'express'
import { AlsService } from 'src/infra/als/als.service'

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly als: AlsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    // const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    // If it's a GET or HEAD request, just skip the ALS logic
    // if (!mutationMethods.includes(req.method)) return next()

    const store: Map<string, any> = new Map()
    store.set('ip', req.ip)
    store.set('url', req.url)

    this.als.run(store, () => next())
  }
}
