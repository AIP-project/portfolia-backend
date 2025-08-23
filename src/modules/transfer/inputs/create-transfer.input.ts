import { InputType, Field, Float } from "@nestjs/graphql"
import { IsNumber, IsOptional, IsString, Min } from "class-validator"

@InputType()
export class CreateTransferInput {
  @Field(() => Number, { description: "출금 계좌 ID" })
  @IsNumber()
  fromAccountId: number

  @Field(() => Number, { description: "입금 계좌 ID" })
  @IsNumber()
  toAccountId: number

  @Field(() => Float, { description: "이체 금액" })
  @IsNumber()
  @Min(0.01)
  amount: number

  @Field(() => Date, { description: "거래일" })
  transactionDate: Date

  @Field(() => String, { nullable: true, description: "메모" })
  @IsOptional()
  @IsString()
  description?: string
}
