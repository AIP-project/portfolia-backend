import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsString } from "class-validator"
import { BankSummaryInput } from "./bank-summary.input"

@InputType()
export class CreateBankSummaryInput extends OmitType(BankSummaryInput, ["id"]) {
  @Field({ nullable: false, description: "은행 계좌 번호" })
  @IsString()
  accountNumber!: string
}
