import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo"
import { Injectable } from "@nestjs/common"
import type { GqlOptionsFactory } from "@nestjs/graphql"
import { GraphQLSchema } from "graphql/type"
import { graphqlLoggingMiddleware } from "../middleware"
import { applyMiddleware } from "graphql-middleware"

@Injectable()
export class GqlConfigService implements GqlOptionsFactory {
  constructor(private readonly schemaFilePath: string) {}

  static forRoot(schemaFilePath: string) {
    return {
      driver: ApolloDriver,
      useFactory: () => {
        return new GqlConfigService(schemaFilePath).createGqlOptions()
      },
    }
  }

  createGqlOptions(): ApolloDriverConfig {
    return {
      autoSchemaFile: this.schemaFilePath,
      sortSchema: true,
      buildSchemaOptions: {
        numberScalarMode: "integer",
      },
      installSubscriptionHandlers: true,
      playground: true,
      cache: "bounded",
      // 스키마 변환 함수를 사용하여 미들웨어 적용
      transformSchema: async (schema: GraphQLSchema) => {
        return applyMiddleware(schema, graphqlLoggingMiddleware) // 모든 필드에 로깅 미들웨어 적용
      },
      formatError: (error) => {
        return {
          message: error.message,
          code: error.extensions?.code || "INTERNAL_SERVER_ERROR",
          path: error.path,
        }
      },
    }
  }
}
