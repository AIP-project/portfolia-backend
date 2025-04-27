import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { CoinPriceHistory } from "../entities"

@ObjectType()
export class StockSummaries extends Paginated(CoinPriceHistory) {}
