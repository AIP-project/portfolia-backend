import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { EtcSummaryInput } from "./etc-summary.input"

@InputType()
export class CreateEtcSummaryInput extends OmitType(EtcSummaryInput, ["id"]) {
  @Field(() => Float, { nullable: false, description: "구매 당시 금액" })
  @IsNumber()
  purchasePrice!: number
}
