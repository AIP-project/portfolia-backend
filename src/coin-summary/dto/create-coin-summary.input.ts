import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsString } from "class-validator"
import { CoinSummaryInput } from "./coin-summary.input"

@InputType()
export class CreateCoinSummaryInput extends OmitType(CoinSummaryInput, ["id"]) {
  @Field({ nullable: false, description: "코인 요약 정보 계좌 번호" })
  @IsString()
  accountNumber!: string
}
