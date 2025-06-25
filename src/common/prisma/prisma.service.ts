import { Injectable, Logger, OnModuleInit } from "@nestjs/common"
import { PrismaClient } from "@prisma/client"
import { ConfigService } from "@nestjs/config"
import { NestConfig } from "../config"

// Prisma 이벤트 타입 정의
interface QueryEvent {
  timestamp: Date
  query: string
  params: string
  duration: number
  target: string
}

// 더 자세한 로깅이 필요한 경우를 위한 확장 버전
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name)

  constructor(private readonly configService: ConfigService) {
    const nestConfig = configService.get<NestConfig>("nest")!

    // 개발 환경에서만 query 이벤트 로깅 활성화
    const logConfig =
      nestConfig.environment !== "prod"
        ? [
            { emit: "event" as const, level: "query" as const },
            { emit: "stdout" as const, level: "error" as const },
            { emit: "stdout" as const, level: "warn" as const },
          ]
        : [{ emit: "stdout" as const, level: "error" as const }]

    super({
      log: logConfig,
    })

    if (nestConfig.environment !== "prod") {
      // 타입 안전성을 위해 이벤트 핸들러 설정
      ;(this as any).$on("query", (e: QueryEvent) => {
        const formattedQuery = this.formatQuery(e.query, e.params)
        this.logger.debug(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Executed Query (${e.duration}ms):
${formattedQuery}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      })

      // $extends를 사용한 로깅 확장
      this.$extends({
        query: {
          async $allOperations({ operation, model, args, query }) {
            const start = performance.now()

            this.logger.debug(`
┌─────────────────────────────────────────
│ Model: ${model}
│ Action: ${operation}
│ Args: ${JSON.stringify(args, null, 2)}
└─────────────────────────────────────────`)

            const result = await query(args)
            const end = performance.now()
            const duration = Math.round(end - start)

            this.logger.debug(`
┌─────────────────────────────────────────
│ Completed: ${model}.${operation}
│ Duration: ${duration}ms
│ Result Count: ${Array.isArray(result) ? result.length : "single record"}
└─────────────────────────────────────────`)

            return result
          },
        },
      })
    }
  }

  /**
   * 쿼리와 파라미터를 결합하여 실행 가능한 SQL 문으로 변환
   */
  private formatQuery(query: string, params: string): string {
    try {
      // 파라미터 파싱
      const parsedParams = this.parseParams(params)
      if (!parsedParams || parsedParams.length === 0) {
        return query
      }

      // 쿼리 문자열 복사
      let formattedQuery = query

      // 각 파라미터를 순서대로 치환
      parsedParams.forEach((param: any) => {
        formattedQuery = formattedQuery.replace(/\?/, () => {
          // null 처리
          if (param === null) return "NULL"

          // boolean 처리
          if (typeof param === "boolean") return param ? "TRUE" : "FALSE"

          // 숫자 처리
          if (typeof param === "number") return param.toString()

          // 날짜 처리
          if (param instanceof Date) return `'${param.toISOString()}'`

          // 문자열 처리 (SQL injection 방지를 위한 이스케이프)
          if (typeof param === "string") {
            const escaped = param.replace(/'/g, "''")
            return `'${escaped}'`
          }

          // 객체나 배열 처리
          if (typeof param === "object") {
            return `'${JSON.stringify(param)}'`
          }

          return String(param)
        })
      })

      return formattedQuery
    } catch (error) {
      this.logger.error("Query formatting error:", error)
      return `${query}\nParams: ${params}`
    }
  }

  /**
   * Prisma 파라미터 문자열 파싱
   */
  private parseParams(inputParams: string): any[] | null {
    try {
      // 개행 문자 제거 및 트림
      let cleaned = inputParams.replace(/\n/g, "").trim()

      // 시작과 끝의 따옴표 제거
      cleaned = cleaned.replace(/^['"]|['"]$/g, "")

      // 문자열 연결 연산자 제거
      cleaned = cleaned.replace(/['"]\s*\+\s*['"]/g, "")

      // JSON 파싱
      const parsed = JSON.parse(cleaned)

      // 배열이 아닌 경우 배열로 변환
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch (e: any) {
      this.logger.error("Parameter parsing error:", e.message)
      this.logger.error("Raw params:", inputParams)
      return null
    }
  }

  async onModuleInit() {
    await this.$connect()
    this.logger.log("Prisma connected successfully")
  }

  async onModuleDestroy() {
    await this.$disconnect()
    this.logger.log("Prisma disconnected")
  }
}
