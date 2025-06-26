import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { WinstonModule } from "nest-winston"
import { createWinstonConfig } from "./common/config/winston.config"
import { ConfigService } from "@nestjs/config"
import { ValidationPipe } from "@nestjs/common"

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false, // DTO에 정의되지 않은 속성 제거
      forbidNonWhitelisted: false, // DTO에 정의되지 않은 속성이 있으면 에러 발생
      transform: true, // ★★★ 이 옵션이 true여야 class-transformer의 변환 기능이 작동합니다.
      transformOptions: {
        enableImplicitConversion: true, // 문자열을 숫자 등으로 암묵적 변환 허용 (필요에 따라)
      },
    }),
  )

  app.enableCors()

  const port = process.env.PORT || 3000

  await app.listen(port)
}

bootstrap().then()
