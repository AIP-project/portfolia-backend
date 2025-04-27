import { Field, InputType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { EtcSummaryInput } from "./etc-summary.input"

@InputType()
export class UpdateEtcSummaryInput extends EtcSummaryInput {
  @Field({ nullable: false, description: "기타 요약 ID" })
  @IsNumber()
  id!: number
}
