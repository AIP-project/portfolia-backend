import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, UserDecoded } from "../common"
import { AccountService } from "./account.service"
import { Account, Accounts, AccountsArgs, CreateAccountInput, UpdateAccountInput } from "./dto"
import { StockSummaryDataLoader } from "../stock-summary/stock-summary.dataloader"
import { BankSummary } from "../bank-summary/dto"
import { CoinSummary } from "../coin-summary/dto"
import { StockSummary } from "../stock-summary/dto"
import { EtcSummary } from "../etc-summary/dto"
import { LiabilitiesSummary } from "../liabilities-summary/dto"
import { CoinSummaryDataLoader } from "../coin-summary/coin-summary.dataloader"
import { BankSummaryDataLoader } from "../bank-summary/bank-summary.dataloader"
import { EtcSummaryDataLoader } from "../etc-summary/etc-summary.dataloader"
import { LiabilitiesSummaryDataLoader } from "../liabilities-summary/liabilities-summary.dataloader"

@Resolver(() => Account)
export class AccountResolver {
  constructor(
    private readonly accountService: AccountService,
    private readonly bankSummaryDataLoader: BankSummaryDataLoader,
    private readonly stockSummaryDataLoader: StockSummaryDataLoader,
    private readonly coinSummaryDataLoader: CoinSummaryDataLoader,
    private readonly etcSummaryDataLoader: EtcSummaryDataLoader,
    private readonly liabilitiesSummaryDataLoader: LiabilitiesSummaryDataLoader,
  ) {}

  @Mutation(() => Account, { description: "계좌 생성" })
  async createAccount(@UserDecoded() jwtPayload: JwtPayload, @Args("input") createAccountInput: CreateAccountInput) {
    return this.accountService.createAccount(jwtPayload, createAccountInput)
  }

  @Query(() => Accounts, { description: "계좌 목록" })
  async accounts(@UserDecoded() jwtPayload: JwtPayload, @Args() accountsArgs: AccountsArgs) {
    return this.accountService.accounts(jwtPayload, accountsArgs)
  }

  @Query(() => Account, { description: "계좌 기본 정보 상세" })
  async account(@UserDecoded() jwtPayload: JwtPayload, @Args("id") id: number) {
    return this.accountService.account(jwtPayload, id)
  }

  @Mutation(() => Account, { description: "계좌 기본 정보 수정" })
  async updateAccount(@UserDecoded() jwtPayload: JwtPayload, @Args("input") updateAccountInput: UpdateAccountInput) {
    return this.accountService.updateAccount(jwtPayload, updateAccountInput)
  }

  @ResolveField("bankSummary", () => BankSummary, { nullable: true, description: "은행 요약 정보" })
  async resolveBankSummary(@Parent() account: Account) {
    return this.bankSummaryDataLoader.bankSummaryByAccountIdsAndCashType.load(account.id)
  }

  @ResolveField("stockSummary", () => StockSummary, { nullable: true, description: "주식 요약 정보" })
  async resolveStockSummary(@Parent() account: Account) {
    return this.stockSummaryDataLoader.stockSummaryByAccountIdsAndCashType.load(account.id)
  }

  @ResolveField("coinSummary", () => CoinSummary, { nullable: true, description: "코인 요약 정보" })
  async resolveCoinSummary(@Parent() account: Account) {
    return this.coinSummaryDataLoader.coinSummaryByAccountIdsAndCashType.load(account.id)
  }

  @ResolveField("etcSummary", () => EtcSummary, { nullable: true, description: "기타 요약 정보" })
  async resolveEtcSummary(@Parent() account: Account) {
    return this.etcSummaryDataLoader.etcSummaryByAccountIdsAndCashType.load(account.id)
  }

  @ResolveField("liabilitiesSummary", () => LiabilitiesSummary, { nullable: true, description: "부채 요약 정보" })
  async resolveLiabilitiesSummary(@Parent() account: Account) {
    return this.liabilitiesSummaryDataLoader.liabilitiesSummaryByAccountIdsAndCashType.load(account.id)
  }
}
