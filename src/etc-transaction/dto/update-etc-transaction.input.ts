import { Field, InputType } from "@nestjs/graphql"
import { EtcTransactionInput } from "./etc-transaction.input"
import { IsNumber } from "class-validator"

@InputType()
export class UpdateEtcTransactionInput extends EtcTransactionInput {
  @Field({ nullable: false, description: "기타 거래 ID" })
  @IsNumber()
  id!: number
}
