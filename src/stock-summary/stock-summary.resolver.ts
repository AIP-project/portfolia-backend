import { Args, Float, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { StockSummaryService } from "./stock-summary.service"
import { JwtPayload, UserDecoded } from "../common"
import { StockSummaries, StockSummariesArgs, StockSummary, UpdateStockSummaryInput } from "./dto"
import { ExchangeDataLoader } from "../exchange/exchange.dataloader"
import { StockPriceDataLoader } from "../stock-price-history/stock-price.dataloader"
import { StockSummaryDataLoader } from "./stock-summary.dataloader"
import { CurrencyType, SummaryType } from "@prisma/client"
import { CurrencyUtils } from "../common/utility"

@Resolver(() => StockSummary)
export class StockSummaryResolver {
  constructor(
    private readonly stockSummaryService: StockSummaryService,
    private readonly exchangeDataLoader: ExchangeDataLoader,
    private readonly stockPriceDataLoader: StockPriceDataLoader,
    private readonly stockSummaryDataLoader: StockSummaryDataLoader,
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
    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      stockSummary.currency,
      stockSummary.amount
    )
  }

  @ResolveField("pricePerShare", () => Float, { nullable: true, description: "구매한 개당 가격" })
  async resolvePricePerUnit(@Parent() stockSummary: StockSummary) {
    if (stockSummary.type === SummaryType.CASH || stockSummary.quantity === 0) return 0
    return stockSummary.amount / stockSummary.quantity
  }

  @ResolveField("currentAmount", () => Float, { nullable: true, description: "현재 가치 총 금액" })
  async resolveCurrentAmount(@Parent() stockSummary: StockSummary) {
    if (!stockSummary.symbol) return 0

    const stockPriceHistory = await this.stockPriceDataLoader.stockPriceBySymbols.load(stockSummary.symbol)
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
    const currentAmount = await this.resolveCurrentAmount(stockSummary)
    if (!currentAmount) return 0

    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      stockSummary.currency,
      currentAmount
    )
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

    const stockPriceHistory = await this.stockPriceDataLoader.stockPriceBySymbols.load(stockSummary.symbol)
    if (!stockPriceHistory) return 0

    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      stockSummary.currency,
      stockPriceHistory.base
    )
  }

  @ResolveField("differenceRate", () => Float, { nullable: true, description: "차액률" })
  async resolveDifferenceRate(@Parent() stockSummary: StockSummary) {
    const currentAmount = await this.resolveCurrentAmount(stockSummary)
    if (!currentAmount) return 0
    return ((currentAmount - stockSummary.amount) / stockSummary.amount) * 100
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
    const totalStocks = await this.stockSummaryDataLoader.stockSummariesByAccountIdsAndSummaryType.load(
      stockSummary.accountId,
    )
    const amounts = await Promise.all(totalStocks.map((stock: StockSummary) => this.resolveCurrentAmount(stock)))
    return amounts.reduce((acc, currentAmount) => acc + currentAmount, 0)
  }

  @ResolveField("totalAccountValue", () => Float, { nullable: true, description: "계좌 총 가치" })
  async resolveTotalAccountValue(@Parent() stockSummary: StockSummary) {
    if (stockSummary.type !== SummaryType.CASH) return 0
    const totalStockValue = await this.resolveTotalStockValue(stockSummary)
    return stockSummary.amount + (totalStockValue || 0)
  }
}
