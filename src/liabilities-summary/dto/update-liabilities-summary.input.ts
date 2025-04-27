import { Field, InputType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { LiabilitiesSummaryInput } from "./liabilities-summary.input"

@InputType()
export class UpdateLiabilitiesSummaryInput extends LiabilitiesSummaryInput {
  @Field({ nullable: false, description: "기타 요약 ID" })
  @IsNumber()
  id!: number
}
