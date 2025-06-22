import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType, SummaryType } from "@prisma/client"

@ObjectType()
export class CoinSummary {
  @Field({ description: "코인 요약 ID" })
  id?: number

  @Field({ description: "코인 요약 정보 이름", nullable: true })
  name?: string

  @Field({ description: "코인 요약 정보 계좌 번호", nullable: true })
  accountNumber?: string

  @Field({ description: "코인 요약 정보 심볼", nullable: true })
  symbol?: string

  @Field({ description: "코인 명칭", nullable: true })
  slug?: string

  @Field(() => Float, { description: "코인 요약 정보 수량" })
  quantity!: number

  @Field(() => Float, { description: "코인 요약 정보 금액" })
  amount!: number

  @Field(() => CurrencyType, { description: "코인 요약 정보 통화", nullable: true })
  currency?: CurrencyType

  @Field(() => SummaryType, { description: "코인 요약 정보 타입(예수금 or 코인 요약)" })
  type!: SummaryType

  @Field({ description: "코인 요약 삭제 여부", nullable: true })
  isDelete?: boolean

  @Field(() => Date)
  createdAt?: Date

  @Field(() => Date)
  updatedAt?: Date

  @Field()
  accountId!: number
}