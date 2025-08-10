import { Field, InputType } from "@nestjs/graphql"
import { LiabilitiesTransactionInput } from "./liabilities-transaction.input"
import { IsNumber } from "class-validator"

@InputType()
export class UpdateLiabilitiesTransactionInput extends LiabilitiesTransactionInput {
  @Field({ nullable: false })
  @IsNumber()
  id!: number
}
