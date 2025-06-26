import { Injectable, Logger } from "@nestjs/common"
import {
  BadRequestException,
  CustomJwtService,
  emailRuleCheck,
  ErrorMessage,
  ForbiddenException,
  InvalidTokenException,
  JwtPayload,
  NotFoundException,
  passwordRuleCheck,
  PasswordService,
  TokenType,
  ValidationException,
} from "../common"
import { SignInInput, SignUpInput, UpdateUserInput, UsersArgs } from "./dto"
import { CommonInput } from "../common/dto/common.input"
import { PrismaService } from "../common/prisma"
import { UserRole, UserState } from "@prisma/client"

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: CustomJwtService,
  ) {}

  async signUp(signUpInput: SignUpInput) {
    const cleanInput = await this.cleanSignUpData(signUpInput)
    const user = await this.txSignUp(cleanInput)
    return await this.postSignUp(user)
  }

  private async cleanSignUpData(signUpInput: SignUpInput) {
    const cleanInput = new SignUpInput()

    if (signUpInput.snsType) {
      throw new BadRequestException(ErrorMessage.MSG_NOT_IMPLEMENTED)
    } else {
      if (!signUpInput.email || !signUpInput.password)
        throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)

      emailRuleCheck(signUpInput.email)
      const existUser = await this.prisma.user.findFirst({ where: { email: signUpInput.email } })
      if (existUser) throw new ValidationException(ErrorMessage.MSG_EMAIL_ALREADY_EXISTS)

      passwordRuleCheck(signUpInput.password)
      const password = await this.passwordService.hashPassword(signUpInput.password)

      cleanInput.email = signUpInput.email
      cleanInput.password = password
    }

    cleanInput.phone = signUpInput.phone
    cleanInput.name = signUpInput.name

    return { ...signUpInput, ...cleanInput }
  }

  private async txSignUp(signUpInput: SignUpInput) {
    return this.prisma.user.create({
      data: signUpInput,
    })
  }

  private async postSignUp(user: any) {
    const jwtPayload: JwtPayload = { id: user.id, role: user.role, email: user.email, currency: user.currency }

    return await this.jwtService.generateTokens(jwtPayload)
  }

  async signIn(signInInput: SignInInput) {
    let user: any
    if (signInInput.email && signInInput.password) {
      const findUser = await this.prisma.user.findFirst({
        where: { email: signInInput.email, state: UserState.ACTIVE },
      })
      if (!findUser) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_USER)

      const isPasswordMatch = await this.passwordService.validatePassword(signInInput.password, findUser.password)
      if (!isPasswordMatch) throw new ValidationException(ErrorMessage.MSG_PASSWORD_NOT_MATCH)

      user = findUser
    } else if (signInInput.snsType && signInInput.snsId) {
      this.logger.warn(`Not implemented yet`)
      throw new ValidationException(ErrorMessage.MSG_INTERNAL_SERVER_ERROR)
    } else {
      throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)
    }

    const jwtPayload: JwtPayload = { id: user.id, role: user.role, email: user.email, currency: user.currency }

    return await this.jwtService.generateTokens(jwtPayload)
  }

  async users(usersArgs: UsersArgs) {
    const { page = 1, take = 10, sortBy = [], name, email, role } = usersArgs
    const skip = (page - 1) * take

    const whereConditions: any = {}

    if (name) whereConditions.name = { contains: name }
    if (email) whereConditions.email = { contains: email }
    if (role) whereConditions.role = role

    // Order by 설정
    const orderBy =
      sortBy.length > 0
        ? sortBy.reduce(
            (acc, { field, direction }) => ({
              ...acc,
              [field]: direction ? "asc" : "desc",
            }),
            {},
          )
        : { createdAt: "asc" } // 기본 정렬

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.user.count({
        where: whereConditions,
      }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: users,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async me(jwtPayload: JwtPayload) {
    return this.prisma.user.findFirst({ where: { id: jwtPayload.id } })
  }

  async user(id: number) {
    return this.prisma.user.findFirst({ where: { id: id } })
  }

  async updateUser(jwtPayload: JwtPayload, updateUserInput: UpdateUserInput) {
    const cleanInput = await this.cleanUpdateUser(jwtPayload, updateUserInput)
    const user = await this.txUpdateUser(cleanInput)
    const { password, ...result } = user
    return result
  }

  private async cleanUpdateUser(jwtPayload: JwtPayload, updateUserInput: UpdateUserInput) {
    const cleanInput = new UpdateUserInput()

    if (jwtPayload.role !== UserRole.ADMIN) {
      if (updateUserInput.id || updateUserInput.role) throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
      cleanInput.id = jwtPayload.id
    } else {
      if (!updateUserInput.id) cleanInput.id = jwtPayload.id
      else cleanInput.id = updateUserInput.id
    }

    if (!cleanInput.id) throw new ValidationException(ErrorMessage.MSG_PARAMETER_REQUIRED)

    const existingUser = await this.prisma.user.findFirst({ where: { id: cleanInput.id } })
    if (!existingUser) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_USER)

    return { ...updateUserInput, ...cleanInput }
  }

  private async txUpdateUser(cleanInput: UpdateUserInput) {
    return this.prisma.user.update({
      where: { id: cleanInput.id },
      data: cleanInput,
    })
  }

  async refreshToken(commonInput: CommonInput) {
    const payload = await this.jwtService.verify(commonInput.value1, TokenType.REFRESH)

    if (!payload) throw new InvalidTokenException(ErrorMessage.MSG_INVALID_TOKEN)

    const user = await this.prisma.user.findFirst({ where: { id: payload.id, state: UserState.ACTIVE } })

    if (!user) throw new NotFoundException(ErrorMessage.MSG_NOT_FOUND_USER)

    const jwtPayload: JwtPayload = { id: user.id, role: user.role, email: user.email, currency: user.currency }

    return await this.jwtService.generateTokens(jwtPayload)
  }
}
