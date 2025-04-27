import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { CoinPriceHistory } from "./entities"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"
import { ExternalServiceException, InterfaceConfig } from "../common"
import { CoinSummary } from "../coin-summary/entities"

@Injectable()
export class CoinPriceHistoryService {
  private readonly logger = new Logger(CoinPriceHistoryService.name)

  constructor(
    @InjectRepository(CoinPriceHistory) private readonly coinPriceHistoryRepository: Repository<CoinPriceHistory>,
    @InjectRepository(CoinSummary) private readonly coinSummaryRepository: Repository<CoinSummary>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateCoinPrice() {
    const distinctCoinSymbols = await this.coinSummaryRepository
      .createQueryBuilder("coinSummary")
      .select("coinSummary.symbol", "symbol")
      .addSelect("coinSummary.slug", "slug")
      .where("coinSummary.type = :type", { type: "SUMMARY" })
      .andWhere("coinSummary.isDelete = :isDelete", { isDelete: false })
      .groupBy("coinSummary.symbol")
      .addGroupBy("coinSummary.slug")
      .getRawMany()

    // const slugsString = distinctCoinSymbols.map((item) => item.slug).join(",")
    const symbolsString = distinctCoinSymbols.map((item) => item.symbol).join(",")

    if (symbolsString.length === 0) {
      return
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

    await this.coinPriceHistoryRepository.save(bulkCoinPriceHistory)

    return "success"
  }

  async findBySymbols(symbols: string[]) {
    return this.coinPriceHistoryRepository
      .createQueryBuilder("cph")
      .where("cph.symbol IN (:...symbols)", { symbols })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("MAX(c.id)")
          .from(CoinPriceHistory, "c")
          .where("c.symbol = cph.symbol")
          .getQuery()
        return "cph.id = " + subQuery
      })
      .getMany()
  }
}
