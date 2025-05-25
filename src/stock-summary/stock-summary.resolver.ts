import { Args, Float, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { StockSummaryService } from "./stock-summary.service"
import { StockSummary } from "./entities"
import { CurrencyType, JwtPayload, SummaryType, UserDecoded } from "../common"
import { StockSummaries, StockSummariesArgs, UpdateStockSummaryInput } from "./dto"
import { ExchangeDataloader } from "../exchange/exchange.dataloader"
import { StockPriceDataloader } from "../stock-price-history/stock-price.dataloader"

@Resolver(() => StockSummary)
export class StockSummaryResolver {
  constructor(
    private readonly stockSummaryService: StockSummaryService,
    private readonly exchangeDataloader: ExchangeDataloader,
    private readonly stockPriceDataloader: StockPriceDataloader,
  ) {}

  @Query(() => StockSummaries, { description: "주식 요약 정보 조회" })
  stockSummaries(@UserDecoded() jwtPayload: JwtPayload, @Args() stockSummariesArgs: StockSummariesArgs) {
    return this.stockSummaryService.stockSummaries(jwtPayload, stockSummariesArgs)
  }

  @Mutation(() => StockSummary, { description: "주식 요약 정보 수정", nullable: true })
  updateStockSummary(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateStockSummaryInput: UpdateStockSummaryInput,
  ) {
    return this.stockSummaryService.updateStockSummary(jwtPayload, updateStockSummaryInput)
  }

  @ResolveField("defaultCurrencyType", () => CurrencyType, { nullable: true, description: "계정 기본 통화" })
  async resolveDefaultCurrencyType(@UserDecoded() jwtPayload: JwtPayload) {
    return jwtPayload.currency
  }

  @ResolveField("amountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 총 금액",
  })
  async resolveAmountInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() stockSummary: StockSummary) {
    if (!stockSummary.currency) return 0

    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(stockSummary.currency)

    if (!exchangeRate) return 0

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[stockSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return stockSummary.amount * crossRate
  }

  @ResolveField("pricePerShare", () => Float, { nullable: true, description: "구매한 개당 가격" })
  async resolvePricePerUnit(@Parent() stockSummary: StockSummary) {
    if (stockSummary.type === SummaryType.CASH) return 0
    return stockSummary.amount / stockSummary.quantity
  }

  @ResolveField("currentAmount", () => Float, { nullable: true, description: "현재 가치 총 금액" })
  async resolveCurrentAmount(@Parent() stockSummary: StockSummary) {
    if (!stockSummary.symbol) return 0

    const stockPriceHistory = await this.stockPriceDataloader.stockPriceBySymbols.load(stockSummary.symbol)
    if (!stockPriceHistory) return 0
    return stockSummary.quantity * stockPriceHistory.base
  }

  @ResolveField("currentAmountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 총 금액",
  })
  async resolveCurrentAmountInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() stockSummary: StockSummary,
  ) {
    if (!stockSummary.currency || !stockSummary.symbol) return 0

    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(stockSummary.currency)

    if (!exchangeRate) return 0

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[stockSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    const stockPriceHistory = await this.stockPriceDataloader.stockPriceBySymbols.load(stockSummary.symbol)

    if (!stockPriceHistory) return 0

    return stockSummary.quantity * stockPriceHistory.base * crossRate
  }

  @ResolveField("pricePerShareInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 개당 가격",
  })
  async resolvePricePerUnitInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() stockSummary: StockSummary,
  ) {
    if (!stockSummary.currency || !stockSummary.symbol) return 0

    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(stockSummary.currency)
    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[stockSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    const stockPriceHistory = await this.stockPriceDataloader.stockPriceBySymbols.load(stockSummary.symbol)

    if (!stockPriceHistory) return 0

    return stockPriceHistory.base * crossRate
  }

  @ResolveField("differenceRate", () => Float, { nullable: true, description: "차액률" })
  async resolveDifferenceRate(@Parent() stockSummary: StockSummary) {
    const currentAmount = await this.resolveCurrentAmount(stockSummary)
    if (!currentAmount) return 0
    return (currentAmount - stockSummary.amount) / stockSummary.amount * 100
  }

  @ResolveField("earned", () => Float, { nullable: true, description: "수익" })
  async resolveEarned(@Parent() stockSummary: StockSummary) {
    const currentAmount = await this.resolveCurrentAmount(stockSummary)
    if (!currentAmount) return 0
    return currentAmount - stockSummary.amount
  }

  @ResolveField("earnedInDefaultCurrency", () => Float, { nullable: true, description: "계정 기본 통화로 환산한 수익" })
  async resolveEarnedInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() stockSummary: StockSummary) {
    const amount = await this.resolveAmountInDefaultCurrency(jwtPayload, stockSummary)
    const currentAmount = await this.resolveCurrentAmountInDefaultCurrency(jwtPayload, stockSummary)
    if (!amount || !currentAmount) return 0
    return currentAmount - amount
  }

  @ResolveField("totalStockValue", () => Float, { nullable: true, description: "보유 주식 총 가치" })
  async resolveTotalStockValue(@Parent() stockSummary: StockSummary) {
    if (stockSummary.type !== SummaryType.CASH) return 0
    const totalStocks = await this.stockSummaryService.totalStocks(stockSummary)
    const amounts = await Promise.all(totalStocks.map((stock) => this.resolveCurrentAmount(stock)))
    return amounts.reduce((acc, currentAmount) => acc + currentAmount, 0)
  }

  @ResolveField("totalAccountValue", () => Float, { nullable: true, description: "계좌 총 가치" })
  async resolveTotalAccountValue(@Parent() stockSummary: StockSummary) {
    if (stockSummary.type !== SummaryType.CASH) return 0
    const totalStockValue = await this.resolveTotalStockValue(stockSummary)
    return stockSummary.amount + (totalStockValue || 0)
  }
}
