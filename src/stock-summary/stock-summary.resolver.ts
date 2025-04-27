import { Args, Float, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { StockSummaryService } from "./stock-summary.service"
import { StockSummary } from "./entities"
import { CurrencyType, JwtPayload, UserDecoded } from "../common"
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
    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(stockSummary.currency)

    if (!exchangeRate) return null

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[stockSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return null

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return stockSummary.amount * crossRate
  }

  @ResolveField("pricePerUnit", () => Float, { nullable: true, description: "구매한 개당 가격" })
  async resolvePricePerUnit(@Parent() stockSummary: StockSummary) {
    return stockSummary.amount / stockSummary.quantity
  }

  @ResolveField("currentAmount", () => Float, { nullable: true, description: "현재 가치 총 금액" })
  async resolveCurrentAmount(@Parent() stockSummary: StockSummary) {
    const stockPriceHistory = await this.stockPriceDataloader.stockPriceBySymbols.load(stockSummary.symbol)
    if (!stockPriceHistory) return null
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
    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(stockSummary.currency)

    if (!exchangeRate) return null

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[stockSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return null

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    const stockPriceHistory = await this.stockPriceDataloader.stockPriceBySymbols.load(stockSummary.symbol)

    if (!stockPriceHistory) return null

    return stockSummary.quantity * stockPriceHistory.base * crossRate
  }

  @ResolveField("pricePerUnitInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 개당 가격",
  })
  async resolvePricePerUnitInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() stockSummary: StockSummary,
  ) {
    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(stockSummary.currency)
    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[stockSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return null

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    const stockPriceHistory = await this.stockPriceDataloader.stockPriceBySymbols.load(stockSummary.symbol)

    if (!stockPriceHistory) return null

    return stockPriceHistory.base * crossRate
  }

  @ResolveField("differenceRate", () => Float, { nullable: true, description: "차액률" })
  async resolveDifferenceRate(@Parent() stockSummary: StockSummary) {
    const currentAmount = await this.resolveCurrentAmount(stockSummary)
    if (!currentAmount) return null
    return (currentAmount - stockSummary.amount) / stockSummary.amount
  }

  @ResolveField("earned", () => Float, { nullable: true, description: "수익" })
  async resolveEarned(@Parent() stockSummary: StockSummary) {
    const currentAmount = await this.resolveCurrentAmount(stockSummary)
    if (!currentAmount) return null
    return currentAmount - stockSummary.amount
  }

  @ResolveField("earnedInDefaultCurrency", () => Float, { nullable: true, description: "계정 기본 통화로 환산한 수익" })
  async resolveEarnedInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() stockSummary: StockSummary) {
    const amount = await this.resolveAmountInDefaultCurrency(jwtPayload, stockSummary)
    const currentAmount = await this.resolveCurrentAmountInDefaultCurrency(jwtPayload, stockSummary)
    if (!amount || !currentAmount) return null
    return currentAmount - amount
  }
}
