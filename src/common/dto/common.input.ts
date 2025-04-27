import { Field, InputType } from "@nestjs/graphql"
import * as Validator from "class-validator"

@InputType()
export class CommonInput {
  @Field(() => String, { nullable: false })
  @Validator.IsString()
  @Validator.MaxLength(1024)
  value1!: string
}
