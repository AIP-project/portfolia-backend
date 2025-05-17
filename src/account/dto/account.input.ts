import { Field, InputType } from "@nestjs/graphql"
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MinLength } from "class-validator"
import { AccountType, CurrencyType } from "../../common"

@InputType({ description: "계좌 입력 타입" })
export class AccountInput {
  @Field({ nullable: true, description: "계좌 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "계좌 별칭" })
  @IsOptional()
  @IsString()
  nickName?: string

  @Field(() => AccountType, { nullable: true, description: "계좌 타입" })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType

  @Field({ nullable: true, description: "비고" })
  @IsOptional()
  @IsString()
  note?: string

  @Field(() => CurrencyType, { nullable: true, description: "계좌 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType

  @Field({ nullable: true, description: "계좌 삭제 여부" })
  @IsOptional()
  @IsBoolean()
  isDelete?: boolean

  @Field({ nullable: true, description: "사용자 ID" })
  @IsOptional()
  @IsNumber()
  userId?: number
}
