import { Field, InputType } from "@nestjs/graphql"
import { IsString, MinLength } from "class-validator"

@InputType({ description: "비밀번호 변경 입력 타입" })
export class PasswordInput {
  @Field({ description: "현재 비밀번호" })
  @IsString()
  currentPassword!: string

  @Field({ description: "새 비밀번호" })
  @IsString()
  @MinLength(8)
  newPassword!: string
}
