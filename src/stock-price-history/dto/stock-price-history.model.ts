import { ObjectType } from "@nestjs/graphql"
import { Paginated } from "../../common"
import { StockPriceHistory } from "../entities"

@ObjectType()
export class StockSummaries extends Paginated(StockPriceHistory) {}
