import { Field, InputType, OmitType } from "@nestjs/graphql"
import { IsString } from "class-validator"
import { CoinSummaryInput } from "./coin-summary.input"

@InputType()
export class CreateCoinSummaryInput extends OmitType(CoinSummaryInput, ["id"]) {
}
