// src/common/middleware/graphql-logging.middleware.ts
import { IMiddlewareFunction } from "graphql-middleware"
import { Logger } from "@nestjs/common"
import { GraphQLResolveInfo } from "graphql"
import { performance } from "perf_hooks" // 'perf_hooks'에서 performance 임포트

const logger = new Logger("GraphqlFieldMiddleware")

function buildPath(info: GraphQLResolveInfo): string {
  let current = info.path
  const path = []
  while (current) {
    path.unshift(current.key)
    current = current.prev
  }
  return path.join(".")
}

export const graphqlLoggingMiddleware: IMiddlewareFunction = async (resolve, root, args, context, info) => {
  const isProd = process.env.NEST_ENVIRONMENT === "prod"

  if (isProd) {
    return resolve(root, args, context, info)
  }

  const pathString = buildPath(info)
  const start = performance.now()

  try {
    const result = await resolve(root, args, context, info)
    const end = performance.now()
    const duration = end - start
    if (duration > 500)
      logger.log(`[${pathString}] - 완료 ✨ | 소요 시간: ${duration.toFixed(3)}ms`)
    return result
  } catch (error) {
    const end = performance.now()
    const duration = end - start
    logger.error(`[${pathString}] - 오류 ❌ | 소요 시간: ${duration.toFixed(3)}ms`, error.stack)
    throw error
  }
}
