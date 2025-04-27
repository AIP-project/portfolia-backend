import { Injectable, Logger } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { StockSummary } from "../stock-summary/entities"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { StockPriceHistory } from "./entities"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"
import { ExternalServiceException, InterfaceConfig } from "../common"

@Injectable()
export class StockPriceHistoryService {
  private readonly logger = new Logger(StockPriceHistoryService.name)

  constructor(
    @InjectRepository(StockPriceHistory) private readonly stockPriceHistoryRepository: Repository<StockPriceHistory>,
    @InjectRepository(StockSummary) private readonly stockSummaryRepository: Repository<StockSummary>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateStockPrice() {
    const distinctStockGroups = await this.stockSummaryRepository
      .createQueryBuilder("stockSummary")
      .select("stockSummary.symbol", "symbol")
      .addSelect("stockSummary.stockCompanyCode", "stockCompanyCode")
      .where("stockSummary.type = :type", { type: "SUMMARY" })
      .andWhere("stockSummary.isDelete = :isDelete", { isDelete: false })
      .groupBy("stockSummary.symbol")
      .addGroupBy("stockSummary.stockCompanyCode")
      .getRawMany()

    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!

    const bulkStockPriceHistory = []

    for (const distinctStockGroup of distinctStockGroups) {
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

    await this.stockPriceHistoryRepository.save(bulkStockPriceHistory)

    return "success"
  }

  async findBySymbols(symbols: string[]) {
    return this.stockPriceHistoryRepository
      .createQueryBuilder("sph")
      .where("sph.symbol IN (:...symbols)", { symbols })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("MAX(s.id)")
          .from(StockPriceHistory, "s")
          .where("s.symbol = sph.symbol")
          .getQuery()
        return "sph.id = " + subQuery
      })
      .getMany()
  }
}
