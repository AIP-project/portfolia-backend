import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType } from "@prisma/client"

@ObjectType()
export class BankSummary {
  @Field()
  id?: number

  @Field({ description: "은행 명", nullable: true })
  name?: string

  @Field({ description: "계좌 번호" })
  accountNumber!: string

  @Field(() => Float, { description: "총 입금 금액" })
  totalDepositAmount!: number

  @Field(() => Float, { description: "총 출금 금액" })
  totalWithdrawalAmount!: number

  @Field(() => Float, { description: "잔액" })
  balance!: number

  @Field(() => CurrencyType, { description: "은행 요약 정보 통화", nullable: true })
  currency?: CurrencyType

  @Field({ description: "은행 요약 삭제 여부", nullable: true })
  isDelete?: boolean

  @Field(() => Date)
  createdAt!: Date

  @Field(() => Date)
  updatedAt!: Date

  @Field()
  accountId!: number
}
