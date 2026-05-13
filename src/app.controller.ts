import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger'
import { AppService } from './app.service'
import { Public } from './auth/decorator'

@ApiTags('App')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @ApiOperation({ summary: 'Hello world endpoint' })
  @ApiOkResponse({ description: 'Returns a greeting message' })
  @Get()
  getHello(): string {
    return this.appService.getHello()
  }
}
