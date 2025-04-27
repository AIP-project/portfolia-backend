import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo"
import { Injectable } from "@nestjs/common"
import type { GqlOptionsFactory } from "@nestjs/graphql"

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
