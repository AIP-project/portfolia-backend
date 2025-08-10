import { Field, InputType } from "@nestjs/graphql"
import { IsNumber } from "class-validator"
import { BankSummaryInput } from "./bank-summary.input"

@InputType()
export class UpdateBankSummaryInput extends BankSummaryInput {
  @Field({ nullable: false, description: "은행 요약 ID" })
  @IsNumber()
  id!: number
}
