import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )

  const SWAGGER_DOC_URL = 'api/swagger-doc'
  const config = new DocumentBuilder()
    .setTitle('Authentication System')
    .setDescription('The authentication system API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build()
  const documentFactory = () => SwaggerModule.createDocument(app, config)
  SwaggerModule.setup(SWAGGER_DOC_URL, app, documentFactory)

  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
