import { Args, Float, Mutation, Parent, ResolveField, Resolver } from "@nestjs/graphql"
import { BankSummaryService } from "./bank-summary.service"
import { JwtPayload, UserDecoded } from "../common"
import { BankSummary, UpdateBankSummaryInput } from "./dto"
import { ExchangeDataLoader } from "../exchange/exchange.dataloader"
import { CurrencyType } from "@prisma/client"

@Resolver(() => BankSummary)
export class BankSummaryResolver {
  constructor(
    private readonly bankSummaryService: BankSummaryService,
    private readonly exchangeDataLoader: ExchangeDataLoader,
  ) {}

  @Mutation(() => BankSummary)
  async updateBankSummary(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateBankSummaryInput: UpdateBankSummaryInput,
  ) {
    return this.bankSummaryService.updateBankSummary(jwtPayload, updateBankSummaryInput)
  }

  @ResolveField("defaultCurrencyType", () => CurrencyType, { nullable: true, description: "계정 기본 통화" })
  async resolveDefaultCurrencyType(@UserDecoded() jwtPayload: JwtPayload) {
    return jwtPayload.currency
  }

  @ResolveField("balanceInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 잔액",
  })
  async resolveBalanceInDefaultCurrency(@UserDecoded() jwtPayload: JwtPayload, @Parent() bankSummary: BankSummary) {
    if (!bankSummary.currency) return 0

    const exchangeRate = await this.exchangeDataLoader.batchLoadExchange.load(bankSummary.currency)

    if (!exchangeRate) return 0

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[bankSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return bankSummary.balance * crossRate
  }

  @ResolveField("totalDepositAmountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 총 입금 금액",
  })
  async resolveTotalDepositAmountInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() bankSummary: BankSummary,
  ) {
    if (!bankSummary.currency) return 0

    const exchangeRate = await this.exchangeDataLoader.batchLoadExchange.load(bankSummary.currency)

    if (!exchangeRate) return 0

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[bankSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return bankSummary.totalDepositAmount * crossRate
  }

  @ResolveField("totalWithdrawalAmountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 총 출금 금액",
  })
  async resolveTotalWithdrawalAmountInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() bankSummary: BankSummary,
  ) {
    if (!bankSummary.currency) return 0

    const exchangeRate = await this.exchangeDataLoader.batchLoadExchange.load(bankSummary.currency)

    if (!exchangeRate) return 0

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[bankSummary.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return bankSummary.totalWithdrawalAmount * crossRate
  }
}
