import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { LiabilitiesSummaryInput } from "./liabilities-summary.input"

@InputType()
export class CreateLiabilitiesSummaryInput extends OmitType(LiabilitiesSummaryInput, ["id"]) {
  @Field(() => Float, { nullable: false, description: "구매 당시 금액" })
  @IsNumber()
  amount!: number
}
