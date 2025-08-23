import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { UserModule } from "./modules/user/user.module"
import { AccountModule } from "./modules/account/account.module"
import { BankTransactionModule } from "./modules/bank-transaction/bank-transaction.module"
import { CoinTransactionModule } from "./modules/coin-transaction/coin-transaction.module"
import { EtcTransactionModule } from "./modules/etc-transaction/etc-transaction.module"
import { StockTransactionModule } from "./modules/stock-transaction/stock-transaction.module"
import { AuthGuard, AuthModule, LoggingPlugin, RedisConfig, RolesGuard } from "./common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import configuration from "./common/config/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriverConfig } from "@nestjs/apollo"
import { WinstonModule } from "nest-winston"
import { createWinstonConfig } from "./common/config/winston.config"
import { LiabilitiesTransactionModule } from "./modules/liabilities-transaction/liabilities-transaction.module"
import { BankSummaryModule } from "./modules/bank-summary/bank-summary.module"
import { CoinSummaryModule } from "./modules/coin-summary/coin-summary.module"
import { StockSummaryModule } from "./modules/stock-summary/stock-summary.module"
import { TerminusModule } from "@nestjs/terminus"
import { AppController } from "./app.controller"
import { StockPriceHistoryModule } from "./modules/stock-price-history/stock-price-history.module"
import { ScheduleModule } from "@nestjs/schedule"
import { CoinPriceHistoryModule } from "./modules/coin-price-history/coin-price-history.module"
import { ExchangeModule } from "./modules/exchange/exchange.module"
import { EtcSummaryModule } from "./modules/etc-summary/etc-summary.module"
import { LiabilitiesSummaryModule } from "./modules/liabilities-summary/liabilities-summary.module"
import { DistributeLockModule } from "./common/service/distributeLock"
import { RedisModule, RedisModuleOptions } from "@nestjs-modules/ioredis"
import { GqlConfigService } from "./common/config/gql-config.service"
import { PrismaModule } from "./common/prisma"
import { DashboardModule } from "./modules/dashboard/dashboard.module"
import { TransferModule } from "./modules/transfer/transfer.module"
import { registerAllEnums } from "./common/graphql/enums"

// Register all GraphQL enums at startup
registerAllEnums()

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),

    GraphQLModule.forRootAsync<ApolloDriverConfig>(GqlConfigService.forRoot("./schema.graphql")),

    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => createWinstonConfig(configService),
    }),

    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<RedisModuleOptions> => {
        await ConfigModule.envVariablesLoaded
        const redis = configService.get<RedisConfig>("redis")!
        return {
          type: "single",
          options: {
            host: redis.host,
            port: redis.port,
          },
        }
      },
    }),

    PrismaModule,
    TerminusModule,
    ScheduleModule.forRoot(),

    AuthModule,
    UserModule,
    AccountModule,
    BankTransactionModule,
    BankSummaryModule,
    CoinTransactionModule,
    CoinSummaryModule,
    StockTransactionModule,
    StockSummaryModule,
    EtcTransactionModule,
    EtcSummaryModule,
    LiabilitiesTransactionModule,
    LiabilitiesSummaryModule,
    StockPriceHistoryModule,
    CoinPriceHistoryModule,
    ExchangeModule,
    DistributeLockModule,
    DashboardModule,
    TransferModule,
  ],
  controllers: [AppController],
  providers: [
    LoggingPlugin,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(LoggerMiddleware).forRoutes({ path: "*", method: RequestMethod.ALL })
  // }
}
