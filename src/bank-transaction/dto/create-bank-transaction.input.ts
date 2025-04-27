import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { BankTransactionInput } from "./bank-transaction.input"
import { IsEnum, IsNumber, IsString, MinLength } from "class-validator"
import { TransactionType } from "../../common"

@InputType()
export class CreateBankTransactionInput extends OmitType(BankTransactionInput, ["id"]) {
  @Field({ nullable: false, description: "은행 거래 명" })
  @IsString()
  @MinLength(2)
  name!: string

  @Field(() => Float, { nullable: false, description: "거래 금액" })
  @IsNumber()
  amount!: number

  @Field(() => TransactionType, { nullable: false, description: "거래 타입 (입금/출금)" })
  @IsEnum(TransactionType)
  type!: TransactionType

  @Field({ nullable: false, description: "거래 일자" })
  @IsString()
  transactionDate!: string

  @Field({ nullable: false, description: "계좌 ID" })
  @IsNumber()
  accountId!: number
}
