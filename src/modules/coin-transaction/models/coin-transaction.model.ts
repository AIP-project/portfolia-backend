import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType, TransactionType } from "@prisma/client"

@ObjectType()
export class CoinTransaction {
  @Field({ description: "코인 거래 ID" })
  id?: number

  @Field({ description: "코인 이름", nullable: true })
  name?: string

  @Field({ description: "코인 심볼", nullable: true })
  symbol?: string

  @Field({ description: "코인 명칭", nullable: true })
  slug?: string

  @Field(() => Float, { description: "코인 수량" })
  quantity!: number

  @Field(() => Float, { description: "코인 가격" })
  price!: number

  @Field(() => Float, { description: "코인 금액" })
  amount!: number

  @Field(() => Float, { description: "코인 수수료" })
  fee!: number

  @Field(() => CurrencyType, { description: "코인 거래 통화", nullable: true })
  currency?: CurrencyType

  @Field(() => TransactionType, { description: "거래 타입" })
  type!: TransactionType

  @Field({ description: "비고", nullable: true })
  note?: string

  @Field(() => Date, { description: "거래 일자", nullable: true })
  transactionDate!: Date

  @Field({ description: "삭제 여부", nullable: true })
  isDelete: boolean

  @Field(() => Date)
  createdAt!: Date

  @Field(() => Date)
  updatedAt!: Date

  @Field()
  accountId!: number
}
