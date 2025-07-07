import { Injectable } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../common"
import { CoinSummariesArgs, UpdateCoinSummaryInput } from "./dto"
import { PrismaService } from "../common/prisma"
import { AccountType, Prisma, SummaryType, UserRole } from "@prisma/client"

@Injectable()
export class CoinSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async coinSummaries(jwtPayload: JwtPayload, coinSummariesArgs: CoinSummariesArgs) {
    const { page = 1, take = 10, sortBy, accountId } = coinSummariesArgs
    const skip = (page - 1) * take

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions = {
      accountId: accountId,
      type: SummaryType.SUMMARY,
      isDelete: false,
    }

    // Order by 설정
    const orderBy =
      sortBy.length > 0
        ? sortBy.map(({ field, direction }) => ({
            [field]: direction ? "asc" : "desc",
          }))
        : [{ createdAt: "asc" }] // 기본 정렬

    const [coinSummaries, total] = await Promise.all([
      this.prisma.coinSummary.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.coinSummary.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: coinSummaries,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async updateCoinSummary(jwtPayload: JwtPayload, updateCoinSummaryInput: UpdateCoinSummaryInput) {
    const cleanInput = await this.cleanUpdateCoinSummary(jwtPayload, updateCoinSummaryInput)
    if (cleanInput.isDelete) return this.txDeleteCoinSummary(cleanInput)
    else return this.txUpdateCoinSummary(cleanInput)
  }

  private async cleanUpdateCoinSummary(jwtPayload: JwtPayload, updateCoinSummaryInput: UpdateCoinSummaryInput) {
    const existingCoinSummary = await this.prisma.coinSummary.findUnique({
      where: { id: updateCoinSummaryInput.id },
    })
    if (!existingCoinSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_COIN_SUMMARY)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: existingCoinSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.COIN) throw new ValidationException(ErrorMessage.MSG_NOT_COIN_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    let cleanInput: UpdateCoinSummaryInput

    if (existingCoinSummary.type === SummaryType.CASH) {
      cleanInput = {
        id: updateCoinSummaryInput.id,
        name: updateCoinSummaryInput.name,
        amount: updateCoinSummaryInput.amount,
        accountNumber: updateCoinSummaryInput.accountNumber,
        currency: updateCoinSummaryInput.currency,
      }
    } else {
      cleanInput = {
        id: updateCoinSummaryInput.id,
        amount: updateCoinSummaryInput.amount,
        quantity: updateCoinSummaryInput.quantity,
        isDelete: updateCoinSummaryInput.isDelete,
      }
    }

    return { ...cleanInput, existingCoinSummary }
  }

  private async txUpdateCoinSummary(cleanInput: UpdateCoinSummaryInput & { existingCoinSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingCoinSummary, ...input } = cleanInput

      return prisma.coinSummary.update({
        where: { id: existingCoinSummary.id },
        data: input,
      })
    })
  }

  private async txDeleteCoinSummary(cleanInput: UpdateCoinSummaryInput & { existingCoinSummary: any }) {
    await this.prisma.$transaction(async (prisma) => {
      const { existingCoinSummary, ...input } = cleanInput
      await prisma.coinTransaction.updateMany({
        where: {
          isDelete: false,
          symbol: existingCoinSummary.symbol,
        },
        data: { isDelete: input.isDelete },
      })
      await prisma.coinSummary.update({
        where: { id: existingCoinSummary.id },
        data: { isDelete: input.isDelete },
      })
    })
    return null
  }

  async findBy(where: Prisma.CoinSummaryWhereInput) {
    return this.prisma.coinSummary.findMany({ where })
  }
}
