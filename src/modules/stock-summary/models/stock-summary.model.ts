import { Field, Float, ObjectType } from "@nestjs/graphql"
import { CurrencyType, SummaryType } from "@prisma/client"

@ObjectType()
export class StockSummary {
  @Field({ description: "주식 요약 ID" })
  id?: number

  @Field({ description: "주식 요약 정보 이름", nullable: true })
  name?: string

  @Field({ description: "주식 요약 정보 계좌 번호", nullable: true })
  accountNumber?: string

  @Field({ description: "주식 요약 정보 심볼", nullable: true })
  symbol?: string

  @Field({ description: "증권사 주식 코드", nullable: true })
  stockCompanyCode?: string

  @Field(() => Float, { description: "주식 요약 정보 수량" })
  quantity!: number

  @Field(() => Float, { description: "주식 요약 정보 금액" })
  amount!: number

  @Field(() => CurrencyType, { description: "주식 요약 정보 통화", nullable: true })
  currency?: CurrencyType

  @Field({ description: "주식 요약 정보 소속 마켓", nullable: true })
  market?: string

  @Field({ description: "주식 요약 정보 로고 이미지", nullable: true })
  logoImageUrl?: string

  @Field(() => SummaryType, { description: "주식 요약 정보 타입(예수금 or 주식 요약)" })
  type!: SummaryType

  @Field({ description: "주식 요약 삭제 여부", nullable: true })
  isDelete?: boolean

  @Field(() => Date, { nullable: true })
  createdAt?: Date

  @Field(() => Date, { nullable: true })
  updatedAt?: Date

  @Field({ nullable: true })
  accountId!: number
}
