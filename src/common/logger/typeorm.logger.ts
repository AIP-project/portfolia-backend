// src/logger/typeorm.logger.ts
import { Logger, QueryRunner } from "typeorm"
import { ConfigService } from "@nestjs/config"
import * as winston from "winston"
import { createWinstonConfig } from "../config/winston.config"

export class TypeOrmLogger implements Logger {
  private logger: winston.Logger

  constructor(configService: ConfigService) {
    this.logger = winston.createLogger(createWinstonConfig(configService))
  }

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    let interpolatedQuery = query
    if (parameters) {
      parameters.forEach((param: any) => {
        interpolatedQuery = interpolatedQuery.replace("?", typeof param === "string" ? `'${param}'` : param)
      })
    }

    this.logger.debug(interpolatedQuery, {
      context: "TypeORM",
      operation: "query",
    })
  }

  logQueryError(error: string | Error, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    let interpolatedQuery = query
    if (parameters) {
      parameters.forEach((param: any) => {
        interpolatedQuery = interpolatedQuery.replace("?", typeof param === "string" ? `'${param}'` : param)
      })
    }
    this.logger.error(interpolatedQuery, {
      context: "TypeORM",
      operation: "query-error",
      error: error instanceof Error ? error.message : error,
    })
  }

  logQuerySlow(time: number, query: string, parameters?: any[], queryRunner?: QueryRunner) {
    let interpolatedQuery = query
    if (parameters) {
      parameters.forEach((param: any) => {
        interpolatedQuery = interpolatedQuery.replace("?", typeof param === "string" ? `'${param}'` : param)
      })
    }
    this.logger.warn(interpolatedQuery, {
      context: "TypeORM",
      operation: "slow-query",
      duration: `${time}ms`,
      query,
      parameters,
    })
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.info("Migration", {
      context: "TypeORM",
      operation: "migration",
      message,
    })
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.info("Schema Build", {
      context: "TypeORM",
      operation: "schema",
      message,
    })
  }

  log(level: "log" | "info" | "warn", message: string, queryRunner?: QueryRunner) {
    const logLevel = level === "log" ? "info" : level
    this.logger.log(logLevel, message, {
      context: "TypeORM",
      operation: "general",
    })
  }
}
