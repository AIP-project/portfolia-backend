import { Field, Float, ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"

@ObjectType()
export class CoinPriceHistory {
  @Field({ description: "코인 가격 이력 ID" })
  id?: number

  @Field({ description: "코인 가격 이력 정보 심볼" })
  symbol!: string

  @Field({ description: "코인 명칭", nullable: true })
  slug?: string

  @Field({ description: "코인 가격 이력 정보 통화", nullable: true })
  currency?: string

  @Field(() => Float, { description: "코인 가격 이력 정보 현재가" })
  price!: number

  @Field(() => Float, { description: "코인 가격 이력 정보 시총", nullable: true })
  marketCap?: number

  @Field(() => Float, { description: "코인 가격 이력 정보 24시간 거래량", nullable: true })
  volumeChange24h?: number

  @Field(() => Date, { description: "코인 정보 업데이트 일자", nullable: true })
  lastUpdated?: Date

  @Field(() => Date, { nullable: true })
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  updatedAt!: Date
}

@ObjectType()
export class CoinPriceHistories extends Paginated(CoinPriceHistory) {}