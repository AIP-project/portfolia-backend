import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { CoinTransactionInput } from "./coin-transaction.input"
import { IsEnum, IsNumber, IsString, MinLength } from "class-validator"
import { TransactionType } from "../../common"

@InputType()
export class CreateCoinTransactionInput extends OmitType(CoinTransactionInput, ["id"]) {
  @Field({ description: "코인 심볼", nullable: false })
  @IsString()
  symbol!: string

  @Field(() => Float, { description: "코인 수량", nullable: false })
  @IsNumber()
  quantity!: number

  @Field(() => Float, { description: "코인 금액", nullable: false })
  amount!: number

  @Field(() => TransactionType, { description: "거래 타입", nullable: false })
  @IsEnum(TransactionType)
  type!: TransactionType

  @Field({ description: "거래일", nullable: false })
  @IsString()
  transactionDate!: string

  @Field({ nullable: false })
  @IsNumber()
  accountId!: number
}
