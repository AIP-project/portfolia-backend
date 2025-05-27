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
import { BankSummary } from "../bank-summary/entities"
import { EtcSummary } from "../etc-summary/entities"
import { LiabilitiesSummary } from "../liabilities-summary/entities"

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name)

  constructor(
    @InjectRepository(ExchangeRate) private readonly exchangeRateRepository: Repository<ExchangeRate>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateExchange() {
    const bankCurrencies = await this.exchangeRateRepository.manager
      .createQueryBuilder(BankSummary, "bankSummary")
      .select("bankSummary.currency")
      .groupBy("bankSummary.currency")
      .getRawMany()

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

    const etcCurrencies = await this.exchangeRateRepository.manager
      .createQueryBuilder(EtcSummary, "etcSummary")
      .select("etcSummary.currency")
      .groupBy("etcSummary.currency")
      .getRawMany()

    const liabilitiesCurrencies = await this.exchangeRateRepository.manager
      .createQueryBuilder(LiabilitiesSummary, "liabilitiesSummary")
      .select("liabilitiesSummary.currency")
      .groupBy("liabilitiesSummary.currency")
      .getRawMany()

    const bankCurrencyValues = bankCurrencies.map((item) => item.bankSummary_currency)
    const stockCurrencyValues = stockCurrencies.map((item) => item.stockSummary_currency)
    const coinCurrencyValues = coinCurrencies.map((item) => item.coinSummary_currency)
    const etcCurrencyValues = coinCurrencies.map((item) => item.etcSummary_currency)
    const liabilitiesCurrencyValues = coinCurrencies.map((item) => item.liabilitiesSummary_currency)

    const uniqueCurrencies = [
      ...new Set([
        ...bankCurrencyValues,
        ...stockCurrencyValues,
        ...coinCurrencyValues,
        ...etcCurrencyValues,
        ...liabilitiesCurrencyValues,
      ]),
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
