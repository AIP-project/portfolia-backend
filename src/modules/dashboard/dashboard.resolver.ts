import { Args, Mutation, Query, Resolver } from "@nestjs/graphql"
import { DashboardService } from "./dashboard.service"
import { JwtPayload, UserDecoded } from "../../common"
import { DashboardDetailItem, RebalancingGoal } from "./models"
import { CreateRebalancingGoalInput } from "./inputs"

@Resolver()
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => [DashboardDetailItem], { description: "대시보드 정보" })
  async dashboard(@UserDecoded() jwtPayload: JwtPayload) {
    return this.dashboardService.dashboard(jwtPayload)
  }

  @Query(() => [RebalancingGoal], { description: "리밸런싱 목표 목록" })
  async rebalancingGoals(@UserDecoded() jwtPayload: JwtPayload) {
    return this.dashboardService.getRebalancingGoals(jwtPayload)
  }

  @Mutation(() => RebalancingGoal, { description: "리밸런싱 목표 수정" })
  async updateRebalancingTarget(
    @UserDecoded() jwtPayload: JwtPayload,
    @Args("input") createRebalancingGoalInput: CreateRebalancingGoalInput,
  ) {
    return this.dashboardService.updateRebalancingTarget(jwtPayload, createRebalancingGoalInput)
  }
}
