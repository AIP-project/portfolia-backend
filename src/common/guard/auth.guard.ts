import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { IS_PUBLIC_KEY } from "../decorator/public.decorator"
import { CustomJwtService } from "../auth/jwt.service"
import { TokenType } from "../enum"
import { GqlExecutionContext } from "@nestjs/graphql"

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: CustomJwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    const gqlContext = GqlExecutionContext.create(context)
    const request = gqlContext.getContext().req

    const authHeader = request.headers.authorization
    if (!authHeader) {
      if (!isPublic) throw new UnauthorizedException("Authorization header not found")
      return true
    }

    const [bearer, token] = authHeader.split(" ")
    if (bearer !== "Bearer" || !token) {
      throw new UnauthorizedException("Invalid authorization format")
    }

    try {
      request.user = await this.jwtService.verify(token, TokenType.ACCESS)
    } catch (e) {
      if (!isPublic) throw e
    }

    return true
  }
}
