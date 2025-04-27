import { Resolver } from "@nestjs/graphql"
import { StockPriceHistoryService } from "./stock-price-history.service"
import { StockPriceHistory } from "./entities"

@Resolver(() => StockPriceHistory)
export class StockPriceHistoryResolver {
  constructor(private readonly stockPriceHistoryService: StockPriceHistoryService) {}
}
