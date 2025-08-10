import { Field, InputType } from "@nestjs/graphql"
import { AccountInput } from "./account.input"
import { IsNumber } from "class-validator"

@InputType()
export class UpdateAccountInput extends AccountInput {
  @Field({ nullable: false, description: "계좌 ID" })
  @IsNumber()
  id!: number
}
