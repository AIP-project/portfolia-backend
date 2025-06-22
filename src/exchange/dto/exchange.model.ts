import { Field, ObjectType } from "@nestjs/graphql"
import { GraphQLJSON } from "graphql-scalars"

@ObjectType()
export class ExchangeRate {
  @Field({ description: "환율 ID" })
  id?: number

  @Field({ description: "환율 정보 기준 통화" })
  base!: string

  @Field(() => GraphQLJSON, { description: "환율 정보 환율" })
  exchangeRates!: Record<string, number>

  createdAt!: Date

  updatedAt!: Date
}