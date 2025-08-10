import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType } from "@prisma/client"

@ObjectType()
export class EtcTransaction {
  @Field({ description: "기타 거래 ID" })
  id?: number

  @Field(() => Date, { description: "거래 일자", nullable: true })
  transactionDate!: Date

  @Field({ description: "기타 거래 이름" })
  name!: string

  @Field(() => Float, { description: "기타 취득 당시 가격" })
  purchasePrice!: number

  @Field(() => Float, { description: "기타 현재 가격", nullable: true })
  currentPrice?: number

  @Field({ description: "거래 기관", nullable: true })
  operation?: string

  @Field(() => CurrencyType, { description: "기타 거래 통화", nullable: true })
  currency?: CurrencyType

  @Field({ description: "기타 비고", nullable: true })
  note?: string

  @Field({ description: "처리 완료 여부" })
  isComplete: boolean

  @Field({ description: "삭제 여부" })
  isDelete: boolean

  @Field(() => Date)
  createdAt!: Date

  @Field(() => Date)
  updatedAt!: Date

  @Field()
  accountId!: number
}
