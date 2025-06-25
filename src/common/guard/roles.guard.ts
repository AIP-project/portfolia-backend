import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { ROLES_KEY } from "../decorator"
import { GqlExecutionContext } from "@nestjs/graphql"
import { UserRole } from "@prisma/client"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // @Roles() 데코레이터가 없으면 통과
    if (!requiredRoles) {
      return true
    }

    const gqlContext = GqlExecutionContext.create(context)
    const user = gqlContext.getContext().req.user

    // Auth Guard에서 헤더가 없어서 user가 없는 경우
    if (!user) {
      throw new UnauthorizedException("User not found")
    }

    return requiredRoles.some((role) => user.role.includes(role))
  }
}
