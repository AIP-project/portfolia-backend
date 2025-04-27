import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { WinstonModule } from "nest-winston"
import { createWinstonConfig } from "./common/config/winston.config"
import { ConfigService } from "@nestjs/config"

async function bootstrap() {
  const configContext = await NestFactory.createApplicationContext(AppModule)
  const configService = configContext.get(ConfigService)
  const winstonConfig = createWinstonConfig(configService)
  await configContext.close()

  // WinstonModule로 logger 생성
  const logger = WinstonModule.createLogger(winstonConfig)

  // 앱 생성시 logger 주입
  const app = await NestFactory.create(AppModule, {
    logger: logger,
  })

  app.enableCors()

  const port = process.env.PORT || 3000

  await app.listen(port)
}

bootstrap().then()
