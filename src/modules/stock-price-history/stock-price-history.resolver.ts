import { Query, Resolver } from "@nestjs/graphql"
import { StockPriceHistoryService } from "./stock-price-history.service"
import { StockPriceHistory } from "./models"
import { Public } from "../../common"

@Resolver(() => StockPriceHistory)
export class StockPriceHistoryResolver {
  constructor(private readonly stockPriceHistoryService: StockPriceHistoryService) {}

  @Public()
  @Query(() => String)
  async updateStockPrice() {
    return this.stockPriceHistoryService.updateStockPrice()
  }
}
