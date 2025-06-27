import { Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { UserModule } from "./user/user.module"
import { AccountModule } from "./account/account.module"
import { BankTransactionModule } from "./bank-transaction/bank-transaction.module"
import { CoinTransactionModule } from "./coin-transaction/coin-transaction.module"
import { EtcTransactionModule } from "./etc-transaction/etc-transaction.module"
import { StockTransactionModule } from "./stock-transaction/stock-transaction.module"
import { AuthGuard, AuthModule, LoggingPlugin, RedisConfig, RolesGuard } from "./common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import configuration from "./common/config/config"
import { GraphQLModule } from "@nestjs/graphql"
import { ApolloDriverConfig } from "@nestjs/apollo"
import { WinstonModule } from "nest-winston"
import { createWinstonConfig } from "./common/config/winston.config"
import { LiabilitiesTransactionModule } from "./liabilities-transaction/liabilities-transaction.module"
import { BankSummaryModule } from "./bank-summary/bank-summary.module"
import { CoinSummaryModule } from "./coin-summary/coin-summary.module"
import { StockSummaryModule } from "./stock-summary/stock-summary.module"
import { TerminusModule } from "@nestjs/terminus"
import { AppController } from "./app.controller"
import { StockPriceHistoryModule } from "./stock-price-history/stock-price-history.module"
import { ScheduleModule } from "@nestjs/schedule"
import { CoinPriceHistoryModule } from "./coin-price-history/coin-price-history.module"
import { ExchangeModule } from "./exchange/exchange.module"
import { EtcSummaryModule } from "./etc-summary/etc-summary.module"
import { LiabilitiesSummaryModule } from "./liabilities-summary/liabilities-summary.module"
import { DistributeLockModule } from "./common/service/distributeLock"
import { RedisModule, RedisModuleOptions } from "@nestjs-modules/ioredis"
import { GqlConfigService } from "./common/config/gql-config.service"
import { PrismaModule } from "./common/prisma"
import { DashboardModule } from './dashboard/dashboard.module'

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
