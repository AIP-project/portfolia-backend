import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType, TransactionType } from "@prisma/client"

@ObjectType()
export class BankTransaction {
  @Field({ description: "은행 거래 ID" })
  id?: number

  @Field({ description: "거래명", nullable: true })
  name?: string

  @Field({ description: "설명", nullable: true })
  description?: string

  @Field(() => Float, { description: "금액" })
  amount!: number

  @Field(() => CurrencyType, { description: "통화", nullable: true })
  currency?: CurrencyType

  @Field(() => TransactionType, { description: "거래 타입" })
  type!: TransactionType

  @Field({ description: "비고", nullable: true })
  note?: string

  @Field(() => Date, { description: "거래 일자", nullable: true })
  transactionDate!: Date

  @Field({ description: "삭제 여부", nullable: true })
  isDelete!: boolean

  @Field(() => Date, { description: "생성일" })
  createdAt!: Date

  @Field(() => Date, { description: "수정일" })
  updatedAt!: Date

  @Field()
  accountId!: number
}
