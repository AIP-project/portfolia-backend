import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"
import { ExternalServiceException, InterfaceConfig, NestConfig } from "../common"
import { PrismaService } from "../common/prisma"

@Injectable()
export class CoinPriceHistoryService {
  private readonly logger = new Logger(CoinPriceHistoryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateCoinPrice() {
    const nestConfig = this.configService.get<NestConfig>("nest")!
    if (nestConfig.environment === "local") {
      return "Local environment, skipping coin price update."
    }

    const distinctCoinSymbols = await this.prisma.coinSummary.findMany({
      where: {
        type: "SUMMARY",
        isDelete: false,
      },
      select: {
        symbol: true,
        slug: true,
      },
      distinct: ["symbol", "slug"],
    })

    // const slugsString = distinctCoinSymbols.map((item) => item.slug).join(",")
    const symbolsString = distinctCoinSymbols.map((item) => item.symbol).join(",")

    if (symbolsString.length === 0) {
      this.logger.warn("No distinct coin symbols found to update.")
      return "No distinct coin symbols found."
    }

    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!

    // const url = `${interfaceConfig.coinPriceApiUrl}?slug=${slugsString}`
    const url = `${interfaceConfig.coinPriceApiUrl}?symbol=${symbolsString}`

    const coinInfos = await firstValueFrom(
      this.httpService
        .get(url, {
          headers: {
            "X-CMC_PRO_API_KEY": interfaceConfig.coinMarketCapApiKey,
          },
        })
        .pipe(
          map((res) => res.data),
          catchError((error: AxiosError) => {
            this.logger.error(`Error searching for coin "${symbolsString}": ${error.message}`)
            throw new ExternalServiceException(`Failed to search coin: ${error.message}`)
          }),
        ),
    )

    const bulkCoinPriceHistory = []

    Object.entries(coinInfos.data).forEach(([symbol, coinArray]: [string, Array<any>]) => {
      if (coinArray.length > 0) {
        const coin = coinArray[0]

        if (!coin.quote.USD || !coin.quote.USD.price) {
          this.logger.warn(`Coin "${symbol}" does not have USD quote data`)
          return
        }

        bulkCoinPriceHistory.push({
          symbol: symbol,
          currency: "USD",
          price: coin.quote.USD.price,
          marketCap: coin.quote.USD.market_cap,
          volumeChange24h: coin.quote.USD.volume_24h,
          lastUpdated: coin.quote.USD.last_updated,
        })
      }
    })

    await this.prisma.coinPriceHistory.createMany({
      data: bulkCoinPriceHistory,
    })

    return "success"
  }

  async findBySymbols(symbols: string[]) {
    if (!symbols || symbols.length === 0) {
      return []
    }

    // 1. 각 symbol 별로 가장 큰 id (최신 id)를 조회합니다.
    const maxIdsResult = await this.prisma.$queryRaw<Array<{ max_id: number }>>`
      SELECT MAX(id) as max_id
      FROM coin_price_history
      WHERE symbol IN (${symbols.map((s) => `'${s}'`).join(",")})
      GROUP BY symbol
    `

    // 결과가 없으면 빈 배열 반환
    if (maxIdsResult.length === 0) {
      return []
    }

    // 조회된 max_id 값들만 추출합니다.
    const latestIds = maxIdsResult.map((result) => result.max_id)

    // 2. 추출된 id 목록을 사용하여 최종 데이터를 조회합니다.
    return this.prisma.coinPriceHistory.findMany({
      where: {
        id: {
          in: latestIds,
        },
      },
    })
  }
}
