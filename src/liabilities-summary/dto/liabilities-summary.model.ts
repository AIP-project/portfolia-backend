import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType } from "../../common"

@ObjectType()
export class LiabilitiesSummary {
  @Field({ description: "부채 요약 ID" })
  id?: number

  @Field({ description: "부채 요약 정보 이름", nullable: true })
  name?: string

  @Field({ description: "부채 요약 정보 계좌 번호", nullable: true })
  accountNumber?: string

  @Field(() => Float, { description: "총 입금 금액" })
  totalDepositAmount!: number

  @Field(() => Float, { description: "총 출금 금액" })
  totalWithdrawalAmount!: number

  @Field(() => Float, { description: "잔액" })
  balance!: number

  @Field(() => Float, { description: "부채 금액 총합" })
  amount!: number

  @Field(() => Float, { description: "부채 남은 금액 총합", nullable: true })
  remainingAmount?: number

  @Field(() => Float, { description: "부채 거래 수" })
  count: number

  @Field(() => CurrencyType, { description: "부채 거래 통화", nullable: true })
  currency?: CurrencyType

  @Field({ description: "대출 요약 삭제 여부", nullable: true })
  isDelete?: boolean

  @Field(() => Date)
  createdAt!: Date

  @Field(() => Date)
  updatedAt!: Date

  @Field()
  accountId!: number
}