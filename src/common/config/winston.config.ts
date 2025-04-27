import { ConfigService } from "@nestjs/config"
import * as winston from "winston"
import { NestConfig } from "./config.interface"

export const createWinstonConfig = (configService: ConfigService) => {
  const nestConfig = configService.get<NestConfig>("nest")!
  const isLocal = nestConfig.environment === "local"

  const customPrintfFormat = winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    const operation = metadata.operation || ""
    const context = metadata.context || ""
    const duration = metadata.duration || ""

    let msg = `[${timestamp}] ${level.toUpperCase()} [${context}${operation ? ":" + operation : ""}] ${message}`

    if (duration) {
      msg += ` (${duration})`
    }

    if (
      Object.keys(metadata).length > 0 &&
      Object.keys(metadata).some((key) => !["operation", "context", "duration"].includes(key))
    ) {
      msg += `\n${JSON.stringify(metadata, null, 2)}`
    }

    return msg
  })

  return {
    transports: [
      new winston.transports.Console({
        level: nestConfig.environment === "production" ? "info" : "debug",
        format: winston.format.combine(
          winston.format.timestamp({
            format: "YYYY-MM-DD HH:mm:ss",
          }),
          isLocal
            ? winston.format.combine(customPrintfFormat, winston.format.colorize({ all: true }))
            : winston.format.combine(winston.format.json(), winston.format.colorize({ all: true })),
        ),
      }),
    ],
  }
}
