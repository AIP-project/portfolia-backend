import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsEnum, IsString } from "class-validator"
import { BankSummaryInput } from "./bank-summary.input"
import { CurrencyType } from "@prisma/client"

@InputType()
export class CreateBankSummaryInput extends OmitType(BankSummaryInput, ["id"]) {
  @Field({ nullable: false, description: "은행 계좌 번호" })
  @IsString()
  accountNumber!: string

  @Field(() => CurrencyType, { nullable: false, description: "계좌 통화" })
  @IsEnum(CurrencyType)
  currency!: CurrencyType
}
