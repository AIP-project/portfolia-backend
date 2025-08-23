import { Field, ID, ObjectType } from "@nestjs/graphql"

@ObjectType({ description: "환율 정보" })
export class ExchangeRate {
  @Field(() => ID, { description: "아이디" })
  id?: number

  @Field({ description: "기준 통화" })
  base!: string

  @Field(() => Object, { description: "환율 정보 (JSON)" })
  exchangeRates!: Record<string, number>

  @Field(() => Date, { nullable: true })
  createdAt!: Date

  @Field(() => Date, { nullable: true })
  updatedAt!: Date
}
