import { Field, InputType } from "@nestjs/graphql"
import { IsEmail, IsOptional, IsString } from "class-validator"

@InputType({ description: "로그인 입력 타입" })
export class SignInInput {
  @Field({ nullable: true, description: "이메일" })
  @IsOptional()
  @IsEmail()
  email?: string

  @Field({ nullable: true, description: "비밀번호" })
  @IsOptional()
  @IsString()
  password?: string

  @Field({ nullable: true, description: "소셜 로그인 타입" })
  @IsOptional()
  @IsString()
  snsType?: string

  @Field({ nullable: true, description: "소셜 로그인 아이디" })
  @IsOptional()
  @IsString()
  snsId?: string
}
