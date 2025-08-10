import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { LiabilitiesTransactionInput } from "./liabilities-transaction.input"
import { IsNumber, IsString } from "class-validator"

@InputType()
export class CreateLiabilitiesTransactionInput extends OmitType(LiabilitiesTransactionInput, ["id"]) {
  @Field({ nullable: false })
  @IsString()
  name!: string

  @Field(() => Float, { nullable: false })
  @IsNumber()
  amount!: number

  @Field(() => Float, { nullable: false })
  @IsNumber()
  remainingAmount!: number

  @Field(() => Float, { nullable: false })
  @IsNumber()
  rate!: number

  @Field({ nullable: false })
  @IsString()
  transactionDate!: string

  @Field({ nullable: false })
  @IsNumber()
  accountId!: number
}
