import { Injectable, Logger } from "@nestjs/common"
import { HttpService } from "@nestjs/axios"
import { ConfigService } from "@nestjs/config"
import { ExternalServiceException, InterfaceConfig, NestConfig } from "../common"
import { firstValueFrom } from "rxjs"
import { catchError, map } from "rxjs/operators"
import { AxiosError } from "axios"
import { PrismaService } from "../common/prisma"

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async updateExchange() {
    const nestConfig = this.configService.get<NestConfig>("nest")!
    if (nestConfig.environment === "local") {
      return
    }

    const bankCurrencies = await this.prisma.bankSummary.findMany({
      select: { currency: true },
      distinct: ["currency"],
    })

    const stockCurrencies = await this.prisma.stockSummary.findMany({
      select: { currency: true },
      distinct: ["currency"],
    })

    const coinCurrencies = await this.prisma.coinSummary.findMany({
      select: { currency: true },
      distinct: ["currency"],
    })

    const etcCurrencies = await this.prisma.etcSummary.findMany({
      select: { currency: true },
      distinct: ["currency"],
    })

    const liabilitiesCurrencies = await this.prisma.liabilitiesSummary.findMany({
      select: { currency: true },
      distinct: ["currency"],
    })

    const bankCurrencyValues = bankCurrencies.map((item) => item.currency)
    const stockCurrencyValues = stockCurrencies.map((item) => item.currency)
    const coinCurrencyValues = coinCurrencies.map((item) => item.currency)
    const etcCurrencyValues = etcCurrencies.map((item) => item.currency)
    const liabilitiesCurrencyValues = liabilitiesCurrencies.map((item) => item.currency)

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

    await this.prisma.exchangeRate.create({
      data: {
        base: exchangeInfo.base,
        exchangeRates: exchangeInfo.rates,
      },
    })

    return "success"
  }

  async lastOneLoad() {
    return this.prisma.exchangeRate.findFirst({
      orderBy: {
        id: "desc",
      },
    })
  }
}
