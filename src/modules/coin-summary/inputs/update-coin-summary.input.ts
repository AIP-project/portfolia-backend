import { Field, InputType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { CoinSummaryInput } from "./coin-summary.input"

@InputType()
export class UpdateCoinSummaryInput extends CoinSummaryInput {
  @Field({ nullable: false, description: "코인 요약 정보 ID" })
  @IsNumber()
  id!: number
}
