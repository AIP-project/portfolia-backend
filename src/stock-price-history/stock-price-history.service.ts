import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"
import { ExternalServiceException, InterfaceConfig, NestConfig } from "../common"
import { PrismaService } from "../common/prisma"

@Injectable()
export class StockPriceHistoryService {
  private readonly logger = new Logger(StockPriceHistoryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateStockPrice() {
    const nestConfig = this.configService.get<NestConfig>("nest")!
    if (nestConfig.environment === "local") {
      return
    }

    const distinctStockGroups = await this.prisma.stockSummary.findMany({
      where: {
        type: "SUMMARY",
        isDelete: false,
      },
      select: {
        symbol: true,
        stockCompanyCode: true,
      },
      distinct: ['symbol', 'stockCompanyCode'],
    })

    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!

    const bulkStockPriceHistory = []

    for (const distinctStockGroup of distinctStockGroups) {
      if (!distinctStockGroup.stockCompanyCode) {
        this.logger.warn(`No stock company code found for symbol "${distinctStockGroup.symbol}"`)
        continue
      }

      const url = `${interfaceConfig.stockPriceApiUrl}${distinctStockGroup.stockCompanyCode}`
      const stockInfo = await firstValueFrom(
        this.httpService.get(url).pipe(
          map((res) => res.data),
          catchError((error: AxiosError) => {
            this.logger.error(`Error searching for stock "${distinctStockGroup.symbol}": ${error.message}`)
            throw new ExternalServiceException(`Failed to search stock: ${error.message}`)
          }),
        ),
      )

      const price = stockInfo.result.prices[0]
      bulkStockPriceHistory.push({
        symbol: distinctStockGroup.symbol,
        currency: price.currency,
        base: price.base,
        close: price.close,
        volume: price.volume,
        changeType: price.changeType,
      })
    }

    await this.prisma.stockPriceHistory.createMany({
      data: bulkStockPriceHistory,
    })

    return "success"
  }

  async findBySymbols(symbols: string[]) {
    if (!symbols || symbols.length === 0) {
      return []
    }

    const maxIdsResult = await this.prisma.$queryRaw<Array<{ max_id: number }>>`
      SELECT MAX(id) as max_id
      FROM stock_price_history 
      WHERE symbol IN (${symbols.map(s => `'${s}'`).join(',')})
      GROUP BY symbol
    `

    if (maxIdsResult.length === 0) {
      return []
    }

    const latestIds = maxIdsResult.map((result) => result.max_id)

    return this.prisma.stockPriceHistory.findMany({
      where: {
        id: {
          in: latestIds,
        },
      },
    })
  }
}
