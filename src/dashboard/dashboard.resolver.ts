import { Query, Resolver } from "@nestjs/graphql"
import { DashboardService } from "./dashboard.service"
import { JwtPayload, UserDecoded } from "../common"
import { Allocation, Dashboard } from "./dto"

@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => Dashboard, { description: "대시보드 정보" })
  async dashboard(@UserDecoded() jwtPayload: JwtPayload) {
    return this.dashboardService.dashboard(jwtPayload)
  }

  @Query(() => Allocation, { description: "자산 비율 정보" })
  async allocation(@UserDecoded() jwtPayload: JwtPayload) {
    return this.dashboardService.allocation(jwtPayload)
  }
}
