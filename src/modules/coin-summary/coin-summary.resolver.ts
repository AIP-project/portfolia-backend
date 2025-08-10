import { Args, Float, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { CoinSummaryService } from "./coin-summary.service"
import { JwtPayload, UserDecoded } from "../../common"
import { CoinSummariesArgs, UpdateCoinSummaryInput } from "./inputs"
import { CoinSummaries, CoinSummary } from "./models"
import { CoinPriceDataLoader } from "../coin-price-history/coin-price.dataloader"
import { ExchangeDataLoader } from "../exchange/exchange.dataloader"
import { CurrencyType, SummaryType } from "@prisma/client"
import { CoinSummaryDataLoader } from "./coin-summary.dataloader"
import { CurrencyUtils } from "../../common/utility"

@Resolver(() => CoinSummary)
export class CoinSummaryResolver {
  constructor(
    private readonly coinSummaryService: CoinSummaryService,
    private readonly exchangeDataLoader: ExchangeDataLoader,
    private readonly coinPriceDataLoader: CoinPriceDataLoader,
    private readonly coinSummaryDataLoader: CoinSummaryDataLoader,
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
    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      coinSummary.currency,
      coinSummary.amount,
    )
  }

  @ResolveField("pricePerShare", () => Float, { nullable: true, description: "구매한 개당 가격" })
  async resolvePricePerUnit(@Parent() coinSummary: CoinSummary) {
    if (coinSummary.type === SummaryType.CASH || coinSummary.quantity === 0) return 0
    return coinSummary.amount / coinSummary.quantity
  }

  @ResolveField("currentAmount", () => Float, { nullable: true, description: "현재 가치 총 금액" })
  async resolveCurrentAmount(@Parent() coinSummary: CoinSummary) {
    if (!coinSummary.currency || !coinSummary.symbol) return 0

    const coinPriceHistory = await this.coinPriceDataLoader.coinPriceBySymbols.load(coinSummary.symbol)
    if (!coinPriceHistory) return 0

    const exchangeRate = await this.exchangeDataLoader.batchLoadExchange.load(coinSummary.currency)

    if (!exchangeRate) return 0

    const historyCurrencyRate = exchangeRate.exchangeRates[coinPriceHistory.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[coinSummary.currency]

    if (!historyCurrencyRate || !summaryCurrencyRate) return 0

    return ((coinSummary.quantity * coinPriceHistory.price) / historyCurrencyRate) * summaryCurrencyRate
  }

  @ResolveField("pricePerShareCurrentAmount", () => Float, {
    nullable: true,
    description: "현재 가치 개당 가격",
  })
  async resolvePricePerUnitCurrentAmount(@Parent() coinSummary: CoinSummary): Promise<number> {
    if (!coinSummary.quantity) {
      return 0
    }

    const currentAmount = await this.resolveCurrentAmount(coinSummary)
    if (!currentAmount) {
      return 0
    }

    return currentAmount / coinSummary.quantity
  }

  @ResolveField("currentAmountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 총 금액",
  })
  async resolveCurrentAmountInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() coinSummary: CoinSummary,
  ) {
    const currentAmount = await this.resolveCurrentAmount(coinSummary)
    if (!currentAmount) return 0

    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      coinSummary.currency,
      currentAmount,
    )
  }

  @ResolveField("pricePerShareInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 개당 가격",
  })
  async resolvePricePerUnitInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() coinSummary: CoinSummary,
  ) {
    if (!coinSummary.currency || !coinSummary.symbol || !coinSummary.quantity) return 0

    const coinPriceHistory = await this.coinPriceDataLoader.coinPriceBySymbols.load(coinSummary.symbol)
    if (!coinPriceHistory) return 0

    // 코인 가격을 직접 사용자 기본 통화로 변환
    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      coinPriceHistory.currency as CurrencyType,
      coinPriceHistory.price,
    )
  }

  @ResolveField("differenceRate", () => Float, { nullable: true, description: "차액률" })
  async resolveDifferenceRate(@Parent() coinSummary: CoinSummary) {
    const currentAmount = await this.resolveCurrentAmount(coinSummary)
    if (!currentAmount) return 0
    return ((currentAmount - coinSummary.amount) / coinSummary.amount) * 100
  }

  @ResolveField("earned", () => Float, { nullable: true, description: "수익" })
  async resolveEarned(@Parent() coinSummary: CoinSummary) {
    const currentAmount = await this.resolveCurrentAmount(coinSummary)
    if (!currentAmount) return 0
    return currentAmount - coinSummary.amount
  }

  @ResolveField("earnedInDefaultCurrency", () => Float, { nullable: true, description: "계정 기본 통화로 환산한 수익" })
  async resolveEarnedInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() coinSummary: CoinSummary) {
    const amount = await this.resolveAmountInDefaultCurrency(jwtPayload, coinSummary)
    const currentAmount = await this.resolveCurrentAmountInDefaultCurrency(jwtPayload, coinSummary)
    if (!amount || !currentAmount) return 0
    return currentAmount - amount
  }

  @ResolveField("totalCoinValue", () => Float, { nullable: true, description: "보유 코인 총 가치" })
  async resolveTotalCoinValue(@Parent() coinSummary: CoinSummary) {
    if (coinSummary.type !== SummaryType.CASH) return 0
    const totalCoinSummaries: CoinSummary[] =
      await this.coinSummaryDataLoader.coinSummariesByAccountIdsAndSummaryType.load(coinSummary.accountId)
    const amounts = await Promise.all(totalCoinSummaries.map((coinSummary) => this.resolveCurrentAmount(coinSummary)))
    return amounts.reduce((acc, currentAmount) => acc + currentAmount, 0)
  }

  @ResolveField("totalAccountValue", () => Float, { nullable: true, description: "계좌 총 가치" })
  async resolveTotalAccountValue(@Parent() coinSummary: CoinSummary) {
    if (coinSummary.type !== SummaryType.CASH) return 0
    const totalCoinValue = await this.resolveTotalCoinValue(coinSummary)
    return coinSummary.amount + (totalCoinValue || 0)
  }

  @ResolveField("totalAccountValueInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 계좌 총 가치",
  })
  async resolveTotalAccountValueInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() coinSummary: CoinSummary,
  ) {
    if (coinSummary.type !== SummaryType.CASH) return 0
    const totalCoinValue = await this.resolveTotalCoinValue(coinSummary)
    const totalAccountValue = coinSummary.amount + (totalCoinValue || 0)

    return await CurrencyUtils.convertCurrency(
      this.exchangeDataLoader,
      jwtPayload.currency,
      coinSummary.currency,
      totalAccountValue,
    )
  }
}
