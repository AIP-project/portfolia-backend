import { Query, Resolver } from "@nestjs/graphql"
import { CoinPriceHistory } from "./dto"
import { CoinPriceHistoryService } from "./coin-price-history.service"
import { Public } from "../common"

@Resolver(() => CoinPriceHistory)
export class CoinPriceHistoryResolver {
  constructor(private readonly coinPriceHistoryService: CoinPriceHistoryService) {}

  @Public()
  @Query(() => String)
  async updateCoinPrice() {
    return this.coinPriceHistoryService.updateCoinPrice()
  }
}
