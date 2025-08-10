import { Field, InputType } from "@nestjs/graphql"
import { BankTransactionInput } from "./bank-transaction.input"
import { IsNumber } from "class-validator"

@InputType()
export class UpdateBankTransactionInput extends BankTransactionInput {
  @Field({ nullable: false, description: "은행 거래 ID" })
  @IsNumber()
  id!: number
}
