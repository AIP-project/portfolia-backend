import { Field, Float, ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"

@ObjectType()
export class StockPriceHistory {
  @Field({ description: "주식 가격 이력 ID" })
  id?: number

  @Field({ description: "주식 가격 이력 정보 심볼" })
  symbol!: string

  @Field({ description: "주식 가격 이력 정보 통화", nullable: true })
  currency?: string

  @Field(() => Float, { description: "주식 가격 이력 정보 기준가 (전일 종가)" })
  base!: number

  @Field(() => Float, { description: "주식 가격 이력 정보 당일 종가" })
  close!: number

  @Field(() => Float, { description: "주식 가격 이력 정보 거래량" })
  volume!: number

  @Field({ description: "주식 가격 이력 정보 가격 변동 방향", nullable: true })
  changeType?: string

  @Field(() => Date, { nullable: true })
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  updatedAt!: Date
}

@ObjectType()
export class StockPriceHistories extends Paginated(StockPriceHistory) {}