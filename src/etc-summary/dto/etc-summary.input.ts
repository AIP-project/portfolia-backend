import { Field, Float, InputType } from "@nestjs/graphql"
import { IsNumber, IsOptional } from "class-validator"

@InputType()
export class EtcSummaryInput {
  @Field({ nullable: true, description: "기타 요약 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field(() => Float, { nullable: true, description: "구매 당시 금액 합" })
  @IsOptional()
  @IsNumber()
  purchasePrice?: number

  @Field(() => Float, { nullable: true, description: "현재 가격 합" })
  @IsOptional()
  @IsNumber()
  currentPrice?: number

  @Field(() => Float, { nullable: true, description: "기타 거래 수" })
  @IsOptional()
  @IsNumber()
  count?: number

  @Field({ nullable: true, description: "계좌 ID ( 관리자 전용 )" })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
