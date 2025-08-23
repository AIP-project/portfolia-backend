import { Args, Mutation, Query, Resolver } from "@nestjs/graphql"
import { UserService } from "./user.service"
import { JwtPayload, Public, Roles, Token, UserDecoded } from "../../common"
import { SignInInput, SignUpInput, UpdateUserInput, UsersArgs } from "./inputs"
import { User, Users } from "./models"
import { CommonInput } from "../../common/dto/common.input"
import { UserRole } from "@prisma/client"

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Mutation(() => Token, { description: "회원가입" })
  signUp(@Args("input") signUpInput: SignUpInput) {
    return this.userService.signUp(signUpInput)
  }

  @Public()
  @Mutation(() => Token, { description: "로그인" })
  signIn(@Args("input") signInInput: SignInInput) {
    return this.userService.signIn(signInInput)
  }

  @Roles([UserRole.ADMIN])
  @Query(() => Users, { description: "유저 리스트" })
  users(@Args() usersArgs: UsersArgs) {
    return this.userService.users(usersArgs)
  }

  @Query(() => User, { description: "내 정보" })
  me(@UserDecoded() jwtPayload: JwtPayload) {
    return this.userService.me(jwtPayload)
  }

  @Roles([UserRole.ADMIN])
  @Query(() => User, { description: "유저 상세" })
  user(@Args("id") id: number) {
    return this.userService.user(id)
  }

  @Mutation(() => Token, { description: "유저 정보 수정" })
  updateUser(@UserDecoded() jwtPayload: JwtPayload, @Args("input") userUpdateInput: UpdateUserInput) {
    return this.userService.updateUser(jwtPayload, userUpdateInput)
  }

  @Public()
  @Mutation(() => Token, { description: "토큰 재발급" })
  refreshToken(@Args("input") commonInput: CommonInput) {
    return this.userService.refreshToken(commonInput)
  }
}
