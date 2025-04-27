import { Field, InputType } from "@nestjs/graphql"
import { IsEmail, IsEnum, IsOptional, IsString } from "class-validator"
import { CurrencyType } from "../../common"

@InputType({ description: "회원가입 입력 타입" })
export class SignUpInput {
  @Field({ description: "이메일" })
  @IsEmail()
  email!: string

  @Field({ nullable: true, description: "비밀번호" })
  @IsOptional()
  @IsString()
  password?: string

  @Field({ description: "이름" })
  @IsString()
  name!: string

  @Field({ nullable: true, description: "전화번호" })
  @IsOptional()
  @IsString()
  phone?: string

  @Field({ nullable: true, description: "소셜 로그인 타입" })
  @IsOptional()
  @IsString()
  snsType?: string

  @Field({ nullable: true, description: "소셜 로그인 아이디" })
  @IsOptional()
  @IsString()
  snsId?: string

  @Field(() => CurrencyType, { nullable: true, description: "유저 기본 통화" })
  @IsOptional()
  @IsEnum(CurrencyType)
  currency?: CurrencyType
}
