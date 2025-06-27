import { Query, Resolver } from "@nestjs/graphql"
import { ExchangeService } from "./exchange.service"
import { Public } from "../common"
import { ExchangeRate } from "./dto"

@Resolver(() => ExchangeRate)
export class ExchangeResolver {
  constructor(private readonly exchangeService: ExchangeService) {}

  @Public()
  @Query(() => String)
  updateExchange() {
    return this.exchangeService.updateExchange()
  }
}
