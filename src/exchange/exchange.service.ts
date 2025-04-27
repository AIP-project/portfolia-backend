import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { InjectRepository } from "@nestjs/typeorm"
import { In, Repository } from "typeorm"
import { StockSummary } from "../stock-summary/entities"
import { ConfigService } from "@nestjs/config"
import { ExchangeRate } from "./entities/exchange-rate.entity"
import { CoinSummary } from "../coin-summary/entities"
import { Account } from "../account/entities/account.entity"
import { ExternalServiceException, InterfaceConfig } from "../common"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name)

  constructor(
    @InjectRepository(ExchangeRate) private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateExchange() {
    const stockCurrencies = await this.exchangeRateRepository.manager
      .createQueryBuilder(StockSummary, "stockSummary")
      .select("stockSummary.currency")
      .groupBy("stockSummary.currency")
      .getRawMany()

    const coinCurrencies = await this.exchangeRateRepository.manager
      .createQueryBuilder(CoinSummary, "coinSummary")
      .select("coinSummary.currency")
      .groupBy("coinSummary.currency")
      .getRawMany()

    const accountCurrencies = await this.exchangeRateRepository.manager
      .createQueryBuilder(Account, "account")
      .select("account.currency")
      .groupBy("account.currency")
      .getRawMany()

    const stockCurrencyValues = stockCurrencies.map((item) => item.stockSummary_currency)
    const coinCurrencyValues = coinCurrencies.map((item) => item.coinSummary_currency)
    const accountCurrencyValues = accountCurrencies.map((item) => item.account_currency)

    const uniqueCurrencies = [
      ...new Set([...stockCurrencyValues, ...coinCurrencyValues, ...accountCurrencyValues]),
    ].filter((currency) => currency !== null && currency !== undefined)

    const interfaceConfig = this.configService.get<InterfaceConfig>("interface")!
    const url = `${interfaceConfig.exchangeRateApiUrl}?app_id=${interfaceConfig.exchangeRateApiKey}&symbols=${uniqueCurrencies.join(",")}`

    const exchangeInfo = await firstValueFrom(
      this.httpService.get(url).pipe(
        map((res) => res.data),
        catchError((error: AxiosError) => {
          this.logger.error(`Error searching for exchange "${url}": ${error.message}`)
          throw new ExternalServiceException(`Failed to search exchange: ${error.message}`)
        }),
      ),
    )

    await this.exchangeRateRepository.save({
      base: exchangeInfo.base,
      exchangeRates: exchangeInfo.rates,
    })

    return "success"
  }

  async findByIds(ids: number[]) {
    return this.exchangeRateRepository.find({
      where: {
        id: In(ids),
      },
    })
  }

  async lastOneLoad() {
    const lastExchange = await this.exchangeRateRepository.find({
      order: {
        id: "DESC",
      },
      take: 1,
    })
    return lastExchange.length > 0 ? lastExchange.at(0) : null
  }
}
