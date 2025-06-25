import { Field, Float, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator"
import { SummaryType } from "@prisma/client"

@InputType()
export class CoinSummaryInput {
  @Field({ nullable: true, description: "코인 요약 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "코인 이름" })
  @IsOptional()
  @IsString()
  name?: string

  @Field({ nullable: true, description: "코인 심볼" })
  @IsOptional()
  @IsString()
  symbol?: string

  @Field({ nullable: true, description: "코인 요약 정보 계좌 번호" })
  @IsOptional()
  @IsString()
  accountNumber?: string

  @Field(() => Float, { nullable: true, description: "코인 수량" })
  @IsOptional()
  @IsNumber()
  quantity?: number

  @Field(() => Float, { nullable: true, description: "코인 금액" })
  @IsOptional()
  @IsNumber()
  amount?: number

  @Field(() => SummaryType, { nullable: true, description: "요약 타입 (예수금 or 코인 요약)" })
  @IsOptional()
  @IsEnum(SummaryType)
  type?: SummaryType

  @Field({ nullable: true, description: "삭제 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true })
  @IsOptional()
  @IsNumber()
  accountId?: number
}
