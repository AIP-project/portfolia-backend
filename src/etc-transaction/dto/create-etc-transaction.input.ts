import { Field, Float, InputType, OmitType } from "@nestjs/graphql"
import { EtcTransactionInput } from "./etc-transaction.input"
import { IsNumber, IsString, MinLength } from "class-validator"

@InputType()
export class CreateEtcTransactionInput extends OmitType(EtcTransactionInput, ["id"]) {
  @Field({ nullable: false, description: "기타 거래 이름" })
  @IsString()
  name!: string

  @Field(() => Float, { nullable: false, description: "기타 거래 구매가격" })
  @IsNumber()
  purchasePrice!: number

  @Field({ nullable: false, description: "거래 일자" })
  @IsString()
  transactionDate!: string

  @Field({ nullable: false, description: "계좌 ID" })
  @IsNumber()
  accountId!: number
}
