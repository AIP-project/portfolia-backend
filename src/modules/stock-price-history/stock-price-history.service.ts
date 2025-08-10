import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"
import { ExternalServiceException, InterfaceConfig, NestConfig } from "../../common"
import { PrismaService } from "../../common/prisma"
import { CurrencyType, Prisma } from "@prisma/client"

export interface StockSearchResult {
  symbol: string
  productCode: string
  keyword: string
}

export interface StockInfo {
  code: string
  currency: string
  market: {
    code: string
  }
  logoImageUrl: string
}

export interface StockInfoApiResponse {
  symbol: string
  stockInfo: StockInfo | null
  success: boolean
  error?: string
}

@Injectable()
export class StockPriceHistoryService {
  private readonly logger = new Logger(StockPriceHistoryService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // 🆕 주식 검색 기능 추가
  /**
   * 심볼로 주식 검색하여 productCode 찾기
   */
  async searchStockBySymbol(symbol: string): Promise<StockSearchResult | null> {
    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!
    const payload = {
      query: symbol,
      sections: [
        {
          type: "PRODUCT",
          option: {
            addIntegratedSearchResult: true,
          },
        },
      ],
    }

    try {
      const response = await firstValueFrom(
        this.httpService
          .post(interfaceConfig.stockSearchApiUrl, payload, {
            headers: {
              "Content-Type": "application/json",
            },
          })
          .pipe(
            map((res) => res.data),
            catchError((error: AxiosError) => {
              this.logger.error(`Error searching for stock "${symbol}": ${error.message}`)
              throw new ExternalServiceException(`Failed to search stock: ${error.message}`)
            }),
          ),
      )

      for (const section of response.result) {
        if (section.type === "PRODUCT" && section.data) {
          for (const data of section.data.items) {
            if (data.symbol === symbol) {
              this.logger.log(`Found stock: ${data.keyword} ${data.productCode} (${data.symbol})`)
              return {
                symbol: data.symbol,
                productCode: data.productCode,
                keyword: data.keyword,
              }
            }
          }
        }
      }

      return null
    } catch (error) {
      this.logger.error(`Exception caught while searching stock "${symbol}": ${error.message}`)
      throw error
    }
  }

  // 🆕 주식 상세 정보 조회 기능 추가
  /**
   * productCode로 주식 상세 정보 조회
   */
  async getStockInfoByProductCode(productCode: string): Promise<StockInfo> {
    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!

    try {
      const stockInfos = await firstValueFrom(
        this.httpService.get(`${interfaceConfig.stockInfoApiUrl}${productCode}`).pipe(
          map((res) => res.data),
          catchError((error: AxiosError) => {
            this.logger.error(`Error getting stock info for productCode "${productCode}": ${error.message}`)
            throw new ExternalServiceException(`Failed to get stock info: ${error.message}`)
          }),
        ),
      )

      return stockInfos.result[0]
    } catch (error) {
      this.logger.error(`Exception caught while getting stock info for productCode "${productCode}": ${error.message}`)
      throw error
    }
  }

  // 🆕 통합 주식 정보 조회 기능
  /**
   * 심볼로 주식 정보 전체 조회 (검색 + 상세정보)
   */
  async getStockInfoBySymbol(symbol: string): Promise<StockInfoApiResponse> {
    try {
      const searchResult = await this.searchStockBySymbol(symbol)

      if (!searchResult) {
        return {
          symbol,
          stockInfo: null,
          success: false,
          error: `Stock not found for symbol: ${symbol}`,
        }
      }

      const stockInfo = await this.getStockInfoByProductCode(searchResult.productCode)

      return {
        symbol,
        stockInfo,
        success: true,
      }
    } catch (error) {
      this.logger.error(`Failed to get stock info for symbol "${symbol}": ${error.message}`)
      return {
        symbol,
        stockInfo: null,
        success: false,
        error: error.message,
      }
    }
  }

  // 🆕 DB 업데이트용 헬퍼 메서드
  /**
   * 주식 정보로 DB 업데이트를 위한 데이터 변환
   */
  getUpdateDataFromStockInfo(stockInfo: StockInfo) {
    return {
      stockCompanyCode: stockInfo.code,
      currency: stockInfo.currency as CurrencyType,
      market: stockInfo.market.code,
      logoImageUrl: stockInfo.logoImageUrl,
    }
  }

  // 🔄 기존 updateStockPrice 메서드 개선
  async updateStockPrice() {
    const nestConfig = this.configService.get<NestConfig>("nest")!
    if (nestConfig.environment === "local") {
      return "Local environment, skipping stock price update."
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
      distinct: ["symbol", "stockCompanyCode"],
    })

    if (distinctStockGroups.length === 0) {
      this.logger.warn("No distinct stock groups found to update.")
      return "No distinct stock groups found."
    }

    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!
    const bulkStockPriceHistory = []

    // stockCompanyCode가 없는 심볼들을 수집하여 한번에 처리
    const noStockCompanySymbols = distinctStockGroups
      .filter((group) => !group.stockCompanyCode)
      .map((group) => group.symbol)

    if (noStockCompanySymbols.length > 0) {
      this.logger.warn(`No stock company codes found for symbols: ${noStockCompanySymbols.join(", ")}`)
      await this.setStockCompanyCodeForSymbols(noStockCompanySymbols)
    }

    // stockCompanyCode가 있는 것들만 가격 업데이트
    const validStockGroups = distinctStockGroups.filter((group) => group.stockCompanyCode)

    for (const distinctStockGroup of validStockGroups) {
      try {
        const url = `${interfaceConfig.stockPriceApiUrl}${distinctStockGroup.stockCompanyCode}`
        const stockInfo = await firstValueFrom(
          this.httpService.get(url).pipe(
            map((res) => res.data),
            catchError((error: AxiosError) => {
              this.logger.error(`Error getting stock price for "${distinctStockGroup.symbol}": ${error.message}`)
              throw new ExternalServiceException(`Failed to get stock price: ${error.message}`)
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
      } catch (error) {
        this.logger.error(`Failed to get price for symbol "${distinctStockGroup.symbol}": ${error.message}`)
      }
    }

    if (bulkStockPriceHistory.length > 0) {
      await this.prisma.stockPriceHistory.createMany({
        data: bulkStockPriceHistory,
      })
    }

    return "success"
  }

  // 🔄 리팩토링된 setStockCompanyCode 메서드
  async setStockCompanyCodeForSymbols(symbols: string[]) {
    for (const symbol of symbols) {
      try {
        const stockInfoResponse = await this.getStockInfoBySymbol(symbol)

        if (stockInfoResponse.success && stockInfoResponse.stockInfo) {
          const updateData = this.getUpdateDataFromStockInfo(stockInfoResponse.stockInfo)

          await this.prisma.stockSummary.updateMany({
            where: {
              symbol: symbol,
              isDelete: false,
            },
            data: updateData,
          })

          this.logger.log(`Updated stock company code for symbol: ${symbol}`)
        } else {
          this.logger.warn(`Failed to get stock info for symbol "${symbol}": ${stockInfoResponse.error}`)
        }
      } catch (error) {
        this.logger.error(`Exception caught while setting stock company code for symbol "${symbol}": ${error.message}`)
      }
    }
  }

  // 기존 메서드 유지
  async findBySymbols(symbols: string[]) {
    if (!symbols || symbols.length === 0) {
      return []
    }

    const maxIdsResult = await this.prisma.$queryRaw<Array<{ max_id: number }>>(
      Prisma.sql`
        SELECT MAX(id) as max_id
        FROM stock_price_history
        WHERE symbol IN (${Prisma.join(symbols)})
        GROUP BY symbol
      `,
    )

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
