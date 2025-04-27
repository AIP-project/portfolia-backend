import type { ApolloServerPlugin, GraphQLRequestContext, GraphQLRequestListener } from "@apollo/server"
import { Plugin } from "@nestjs/apollo"
import { Inject } from "@nestjs/common"
import { WINSTON_MODULE_PROVIDER } from "nest-winston"
import { Logger } from "winston"

@Plugin()
export class LoggingPlugin implements ApolloServerPlugin {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  async requestDidStart({ request }: GraphQLRequestContext<any>): Promise<GraphQLRequestListener<any>> {
    const requestStartTime = Date.now()
    const { query, variables, operationName } = request
    const logger = this.logger

    return {
      async parsingDidStart() {
        return async (err) => {
          if (err) {
            logger.error("GraphQL Parsing Error", {
              error: err.message,
              query,
              variables,
              operationName,
            })
          }
        }
      },

      async validationDidStart() {
        return async (errs) => {
          if (errs) {
            logger.error("GraphQL Validation Error", {
              errors: errs.map((err) => err.message),
              query,
              variables,
              operationName,
            })
          }
        }
      },

      async executionDidStart() {
        return {
          async executionDidEnd(err) {
            if (err) {
              logger.error("GraphQL Execution Error", {
                error: err.message,
                query,
                variables,
                operationName,
              })
            }
          },
        }
      },

      async willSendResponse({ response }) {
        const requestDuration = Date.now() - requestStartTime

        if (process.env.NODE_ENV !== "production") {
          logger.info("GraphQL Request Completed", {
            operation: operationName || "Anonymous Operation",
            query: query?.replace(/\s+/g, " ").trim(),
            variables,
            duration: `${requestDuration}ms`,
            errors: response.body.kind === "single" ? response.body.singleResult.errors : undefined,
            status: response.body.kind === "single" && response.body.singleResult.errors?.length ? "error" : "success",
            response: response.body.kind === "single" ? response.body.singleResult.data : response,
          })
        }
      },
    }
  }
}
