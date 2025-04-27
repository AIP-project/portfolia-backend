import { Injectable, NestMiddleware } from "@nestjs/common"
import { NextFunction, Request, Response } from "express"
import * as winston from "winston"
import { Logger } from "winston"
import { ConfigService } from "@nestjs/config"
import { createWinstonConfig } from "../config/winston.config"

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger: Logger

  constructor(private configService: ConfigService) {
    this.logger = winston.createLogger(createWinstonConfig(configService))
  }

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip, body, query } = request
    const startTime = Date.now()

    const originalSend = response.send
    let responseBody: any

    response.send = function (body: any) {
      responseBody = body
      return originalSend.call(this, body)
    }

    const filterSensitiveData = (data: any) => {
      if (!data) return data

      // JSON 문자열인 경우 파싱
      if (typeof data === "string") {
        try {
          data = JSON.parse(data)
        } catch (e) {
          return data
        }
      }

      const filtered = { ...data }
      const sensitiveFields = ["password", "token", "secret"]

      sensitiveFields.forEach((field) => {
        if (field in filtered) {
          delete filtered[field] // 완전히 제거
        }
      })

      return filtered
    }

    response.on("finish", () => {
      const { statusCode } = response
      const responseTime = Date.now() - startTime

      this.logger.info("HTTP Request", {
        context: "HTTP",
        operation: "request",
        method,
        originalUrl,
        statusCode,
        duration: `${responseTime}ms`,
        query: Object.keys(query).length ? filterSensitiveData(query) : undefined,
        body: Object.keys(body).length ? filterSensitiveData(body) : undefined,
        response: responseBody ? filterSensitiveData(responseBody) : undefined,
      })
    })

    next()
  }
}
