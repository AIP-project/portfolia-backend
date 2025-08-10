import { Field, InputType, OmitType } from "@nestjs/graphql"
import { AccountInput } from "./account.input"
import { IsEnum, IsOptional, ValidateNested } from "class-validator"
import { CreateBankSummaryInput } from "../../bank-summary/inputs"
import { CreateStockSummaryInput } from "../../stock-summary/inputs"
import { CreateCoinSummaryInput } from "../../coin-summary/inputs"
import { AccountType } from "@prisma/client"

@InputType()
export class CreateAccountInput extends OmitType(AccountInput, ["id"]) {
  @Field(() => AccountType, { nullable: false, description: "계좌 타입" })
  @IsEnum(AccountType)
  type!: AccountType

  @Field({ nullable: true })
  @IsOptional()
  @ValidateNested()
  bankSummary?: CreateBankSummaryInput

  @Field({ nullable: true })
  @IsOptional()
  @ValidateNested()
  stockSummary?: CreateStockSummaryInput

  @Field({ nullable: true })
  @IsOptional()
  @ValidateNested()
  coinSummary?: CreateCoinSummaryInput
}
