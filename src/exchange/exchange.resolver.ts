import { Query, Resolver } from "@nestjs/graphql"
import { ExchangeRate } from "./entities/exchange-rate.entity"
import { ExchangeService } from "./exchange.service"
import { Public } from "../common"

@Resolver(() => ExchangeRate)
export class ExchangeResolver {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Public()
  @Query(() => String)
  updateExchange() {
    return this.exchangeService.updateExchange()
  }
}
