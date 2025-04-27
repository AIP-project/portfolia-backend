import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { CoinSummary } from "../entities"

@ObjectType()
export class CoinSummaries extends Paginated(CoinSummary) {}
