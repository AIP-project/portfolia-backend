import { Args, Float, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, parseISOString, UserDecoded } from "../common"
import { CreateEtcTransactionInput, EtcTransactions, EtcTransactionsArgs, UpdateEtcTransactionInput } from "./dto"
import { EtcTransactionService } from "./etc-transaction.service"
import { EtcTransaction } from "./entities"
import { ExchangeDataLoader } from "../exchange/exchange.dataloader"

@Resolver(() => EtcTransaction)
export class EtcTransactionResolver {
  constructor(
    private readonly etcTransactionService: EtcTransactionService,
    private readonly exchangeDataLoader: ExchangeDataLoader,
  ) {}

  @Mutation(() => EtcTransaction)
  async createEtcTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createEtcTransactionInput: CreateEtcTransactionInput,
  ) {
    return this.etcTransactionService.createEtcTransaction(jwtPayload, createEtcTransactionInput)
  }

  @Query(() => EtcTransactions)
  async etcTransactions(@UserDecoded() jwtPayload: JwtPayload, @Args() etcTransactionsArgs: EtcTransactionsArgs) {
    return this.etcTransactionService.etcTransactions(jwtPayload, etcTransactionsArgs)
  }

  @Query(() => EtcTransaction)
  async etcTransaction(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.etcTransactionService.etcTransaction(jwtPayload, id)
  }

  @Mutation(() => EtcTransaction)
  async updateEtcTransaction(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") updateEtcTransactionInput: UpdateEtcTransactionInput,
  ) {
    return this.etcTransactionService.updateEtcTransaction(jwtPayload, updateEtcTransactionInput)
  }

  @ResolveField("transactionDate", () => Date, { nullable: true, description: "거래 일자" })
  async resolveTransactionDate(@Parent() etcTransaction: EtcTransaction) {
    return parseISOString(etcTransaction.transactionDate)
  }

  @ResolveField("currentAmountInDefaultCurrency", () => Float, {
    nullable: true,
    description: "계정 기본 통화로 환산한 현재 가치 총 금액",
  })
  async resolveCurrentAmountInDefaultCurrency(
    @UserDecoded() jwtPayload: JwtPayload,
    @Parent() etcTransaction: EtcTransaction,
  ) {
    if (!etcTransaction.currency || !etcTransaction.currentPrice) return 0

    const exchangeRate = await this.exchangeDataLoader.batchLoadExchange.load(etcTransaction.currency)

    if (!exchangeRate) return 0

    const defaultCurrencyRate = exchangeRate.exchangeRates[jwtPayload.currency]
    const summaryCurrencyRate = exchangeRate.exchangeRates[etcTransaction.currency]

    if (!defaultCurrencyRate || !summaryCurrencyRate) return 0

    const crossRate = defaultCurrencyRate / summaryCurrencyRate

    return etcTransaction.currentPrice * crossRate
  }

  @ResolveField("returnRate", () => Float, {
    nullable: true,
    description: "수익률",
  })
  async resolveReturnRate(@Parent() etcTransaction: EtcTransaction) {
    if (!etcTransaction.currentPrice || !etcTransaction.purchasePrice) return 0

    return ((etcTransaction.currentPrice - etcTransaction.purchasePrice) / etcTransaction.purchasePrice) * 100
  }
}
