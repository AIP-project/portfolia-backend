import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType } from "../../common"

@ObjectType()
export class LiabilitiesTransaction {
  @Field({ description: "부채 거래 ID" })
  id?: number

  @Field(() => Date, { description: "거래 일자", nullable: false })
  transactionDate!: Date

  @Field({ description: "부채 거래 이름" })
  name!: string

  @Field(() => Float, { description: "부채 거래 금액" })
  amount!: number

  @Field(() => Float, { description: "부채 남은 금액", nullable: true })
  remainingAmount?: number

  @Field(() => Float, { description: "이율", nullable: true })
  rate!: number

  @Field({ description: "연이율 여부", nullable: true })
  isYearly: boolean

  @Field({ description: "거래 기관", nullable: true })
  operation?: string

  @Field(() => CurrencyType, { description: "기타 거래 통화", nullable: true })
  currency?: CurrencyType

  @Field({ description: "비고", nullable: true })
  note?: string

  @Field(() => Date, { description: "상환 일자", nullable: true })
  repaymentDate?: Date

  @Field({ description: "거래 완료 여부", nullable: true })
  isComplete: boolean

  @Field({ description: "거래 삭제 여부", nullable: true })
  isDelete: boolean

  @Field(() => Date)
  createdAt!: Date

  @Field(() => Date)
  updatedAt!: Date

  @Field()
  accountId!: number
}