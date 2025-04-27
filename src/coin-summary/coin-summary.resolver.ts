import { Args, Float, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { CoinSummaryService } from "./coin-summary.service"
import { CoinSummary } from "./entities"
import { CurrencyType, JwtPayload, UserDecoded } from "../common"
import { CoinSummaries, CoinSummariesArgs, UpdateCoinSummaryInput } from "./dto"
import { CoinPriceDataloader } from "../coin-price-history/coin-price.dataloader"
import { ExchangeDataloader } from "../exchange/exchange.dataloader"

@Resolver(() => CoinSummary)
export class CoinSummaryResolver {
  constructor(
    private readonly coinSummaryService: CoinSummaryService,
    private readonly exchangeDataloader: ExchangeDataloader,
    private readonly coinPriceDataloader: CoinPriceDataloader,
  ) {}

  @Query(() => CoinSummaries, { description: "코인 요약 정보 조회" })
  async coinSummaries(@UserDecoded() jwtPayload: JwtPayload, @Args() coinSummariesArgs: CoinSummariesArgs) {
    return this.coinSummaryService.coinSummaries(jwtPayload, coinSummariesArgs)
  }

  @Mutation(() => CoinSummary, { description: "코인 요약 정보 수정", nullable: true })
  async updateCoinSummary(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateCoinSummaryInput: UpdateCoinSummaryInput,
  ) {
    return this.coinSummaryService.updateCoinSummary(jwtPayload, updateCoinSummaryInput)
  }

  @ResolveField("defaultCurrencyType", () => CurrencyType, { nullable: true, description: "계정 기본 통화" })
  async resolveDefaultCurrencyType(@UserDecoded() jwtPayload: JwtPayload) {
    return jwtPayload.currency
  }

  @ResolveField("amountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 총 금액",
  })
  async resolveAmountInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() coinSummary: CoinSummary) {
    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(coinSummary.currency)

    if (!exchangeRate) return null

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[coinSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return null

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return coinSummary.amount * crossRate
  }

  @ResolveField("pricePerUnit", () => Float, { nullable: true, description: "구매한 개당 가격" })
  async resolvePricePerUnit(@Parent() coinSummary: CoinSummary) {
    return coinSummary.amount / coinSummary.quantity
  }

  @ResolveField("currentAmount", () => Float, { nullable: true, description: "현재 가치 총 금액" })
  async resolveCurrentAmount(@Parent() coinSummary: CoinSummary) {
    const coinPriceHistory = await this.coinPriceDataloader.coinPriceBySymbols.load(coinSummary.symbol)
    if (!coinPriceHistory) return null

    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(coinSummary.currency)

    if (!exchangeRate) return null

    const historyCurrencyRate = exchangeRate.exchangeRates[coinPriceHistory.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[coinSummary.currency]

    if (!historyCurrencyRate || !summaryCurrencyRate) return null

    return (coinSummary.quantity * coinPriceHistory.price * historyCurrencyRate) / summaryCurrencyRate
  }

  @ResolveField("currentAmountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 총 금액",
  })
  async resolveCurrentAmountInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() coinSummary: CoinSummary,
  ) {
    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(coinSummary.currency)

    if (!exchangeRate) return null

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[coinSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return null

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    const coinPriceHistory = await this.coinPriceDataloader.coinPriceBySymbols.load(coinSummary.symbol)

    const historyCurrencyRate = exchangeRate.exchangeRates[coinPriceHistory.currency]

    if (!coinPriceHistory || !historyCurrencyRate) return null

    return ((coinSummary.quantity * coinPriceHistory.price * historyCurrencyRate) / summaryCurrencyRate) * crossRate
  }

  @ResolveField("pricePerUnitInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 개당 가격",
  })
  async resolvePricePerUnitInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() coinSummary: CoinSummary,
  ) {
    const exchangeRate = await this.exchangeDataloader.batchLoadExchange.load(coinSummary.currency)
    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[coinSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return null

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    const coinPriceHistory = await this.coinPriceDataloader.coinPriceBySymbols.load(coinSummary.symbol)

    const historyCurrencyRate = exchangeRate.exchangeRates[coinPriceHistory.currency]

    if (!coinPriceHistory || !historyCurrencyRate) return null

    return ((coinPriceHistory.price * historyCurrencyRate) / summaryCurrencyRate) * crossRate
  }

  @ResolveField("differenceRate", () => Float, { nullable: true, description: "차액률" })
  async resolveDifferenceRate(@Parent() coinSummary: CoinSummary) {
    const currentAmount = await this.resolveCurrentAmount(coinSummary)
    if (!currentAmount) return null
    return (currentAmount - coinSummary.amount) / coinSummary.amount
  }

  @ResolveField("earned", () => Float, { nullable: true, description: "수익" })
  async resolveEarned(@Parent() coinSummary: CoinSummary) {
    const currentAmount = await this.resolveCurrentAmount(coinSummary)
    if (!currentAmount) return null
    return currentAmount - coinSummary.amount
  }

  @ResolveField("earnedInDefaultCurrency", () => Float, { nullable: true, description: "계정 기본 통화로 환산한 수익" })
  async resolveEarnedInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() coinSummary: CoinSummary) {
    const amount = await this.resolveAmountInDefaultCurrency(jwtPayload, coinSummary)
    const currentAmount = await this.resolveCurrentAmountInDefaultCurrency(jwtPayload, coinSummary)
    if (!amount || !currentAmount) return null
    return currentAmount - amount
  }
}
