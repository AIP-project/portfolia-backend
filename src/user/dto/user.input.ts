import { Field, InputType } from "@nestjs/graphql"
import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, MinLength } from "class-validator"
import { CurrencyType, UserRole } from "../../common"
import { UserState } from "../../common/enum/user-state.enum"

@InputType({ description: "사용자 입력 타입" })
export class UserInput {
  @Field({ nullable: true, description: "사용자 ID" })
  @IsOptional()
  @IsNumber()
  id?: number

  @Field({ nullable: true, description: "사용자 이름" })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string

  @Field({ nullable: true, description: "사용자 이메일" })
  @IsOptional()
  @IsEmail()
  email?: string

  @Field({ nullable: true, description: "사용자 전화번호" })
  @IsOptional()
  @IsEmail()
  phone?: string

  @Field(() => UserRole, { nullable: true, description: "사용자 역할" })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @Field(() => UserState, { nullable: true, description: "사용자 상태" })
  @IsOptional()
  @IsEnum(UserState)
  state?: UserState

  @Field(() => CurrencyType, { nullable: true, description: "사용자 기본 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType
}
