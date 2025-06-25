import { ArgsType, Field } from "@nestjs/graphql"
import { IsNumber, IsOptional, IsString } from "class-validator"
import { PageSearchArgs } from "../../common"
import { TransactionType } from "@prisma/client"

@ArgsType()
export class BankTransactionsArgs extends PageSearchArgs {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string

  @Field(() => TransactionType, { nullable: true })
  @IsOptional()
  type?: TransactionType

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  note?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  fromTransactionDate?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  toTransactionDate?: string

  @Field(() => Number, { nullable: false })
  @IsOptional()
  @IsNumber()
  accountId!: number
}
