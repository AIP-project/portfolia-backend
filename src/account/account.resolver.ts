import { Args, Mutation, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql"
import { JwtPayload, UserDecoded } from "../common"
import { AccountService } from "./account.service"
import { Account } from "./entities/account.entity"
import { Accounts, AccountsArgs, Allocation, CreateAccountInput, Dashboard, UpdateAccountInput } from "./dto"
import { BankSummary } from "../bank-summary/entities"
import { EtcSummary } from "../etc-summary/entities"
import { LiabilitiesSummary } from "../liabilities-summary/entities"
import { StockSummary } from "../stock-summary/entities"
import { CoinSummary } from "../coin-summary/entities"

@Resolver(() => Account)
export class AccountResolver {
  constructor(private readonly accountService: AccountService) {}

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
  async resolveBankSummary(@UserDecoded() payload: JwtPayload, @Parent() account: Account) {
    return this.accountService.resolveBankSummary(payload, account)
  }

  @ResolveField("stockSummary", () => StockSummary, { nullable: true, description: "주식 요약 정보" })
  async resolveStockSummary(@UserDecoded() payload: JwtPayload, @Parent() account: Account) {
    return this.accountService.resolveStockSummary(payload, account)
  }

  @ResolveField("coinSummary", () => CoinSummary, { nullable: true, description: "코인 요약 정보" })
  async resolveCoinSummary(@UserDecoded() payload: JwtPayload, @Parent() account: Account) {
    return this.accountService.resolveCoinSummary(payload, account)
  }

  @ResolveField("etcSummary", () => EtcSummary, { nullable: true, description: "기타 요약 정보" })
  async resolveEtcSummary(@UserDecoded() payload: JwtPayload, @Parent() account: Account) {
    return this.accountService.resolveEtcSummary(payload, account)
  }

  @ResolveField("liabilitiesSummary", () => LiabilitiesSummary, { nullable: true, description: "부채 요약 정보" })
  async resolveLiabilitiesSummary(@UserDecoded() payload: JwtPayload, @Parent() account: Account) {
    return this.accountService.resolveLiabilitiesSummary(payload, account)
  }

  @Query(() => Dashboard, { description: "대시보드 정보" })
  async dashboard(@UserDecoded() jwtPayload: JwtPayload) {
    return this.accountService.dashboard(jwtPayload)
  }

  @Query(() => Allocation, { description: "자산 비율 정보" })
  async allocation(@UserDecoded() jwtPayload: JwtPayload) {
    return this.accountService.allocation(jwtPayload)
  }
}
