import { Injectable } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../common"
import { StockSummariesArgs, UpdateStockSummaryInput } from "./dto"
import { PrismaService } from "../common/prisma"
import { AccountType, Prisma, SummaryType, UserRole } from "@prisma/client"

@Injectable()
export class StockSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async stockSummaries(jwtPayload: JwtPayload, stockSummariesArgs: StockSummariesArgs) {
    const { page = 1, take = 10, sortBy, accountId } = stockSummariesArgs
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

    const [stockSummaries, total] = await Promise.all([
      this.prisma.stockSummary.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.stockSummary.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: stockSummaries,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async updateStockSummary(jwtPayload: JwtPayload, updateStockSummaryInput: UpdateStockSummaryInput) {
    const cleanInput = await this.cleanUpdateStockSummary(jwtPayload, updateStockSummaryInput)
    if (cleanInput.isDelete) return this.txDeleteStockSummary(cleanInput)
    else return this.txUpdateStockSummary(cleanInput)
  }

  private async cleanUpdateStockSummary(jwtPayload: JwtPayload, updateStockSummaryInput: UpdateStockSummaryInput) {
    const existingStockSummary = await this.prisma.stockSummary.findUnique({
      where: { id: updateStockSummaryInput.id },
    })
    if (!existingStockSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_SUMMARY)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: existingStockSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.STOCK) throw new ValidationException(ErrorMessage.MSG_NOT_STOCK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    let cleanInput: UpdateStockSummaryInput

    if (existingStockSummary.type === SummaryType.CASH) {
      cleanInput = {
        id: updateStockSummaryInput.id,
        name: updateStockSummaryInput.name,
        amount: updateStockSummaryInput.amount,
        accountNumber: updateStockSummaryInput.accountNumber,
        currency: updateStockSummaryInput.currency,
      }
    } else {
      cleanInput = {
        id: updateStockSummaryInput.id,
        amount: updateStockSummaryInput.amount,
        quantity: updateStockSummaryInput.quantity,
        currency: updateStockSummaryInput.currency,
        isDelete: updateStockSummaryInput.isDelete,
      }
    }

    return { ...cleanInput, existingStockSummary }
  }

  private async txUpdateStockSummary(cleanInput: UpdateStockSummaryInput & { existingStockSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingStockSummary, ...input } = cleanInput

      return prisma.stockSummary.update({
        where: { id: existingStockSummary.id },
        data: input,
      })
    })
  }

  private async txDeleteStockSummary(cleanInput: UpdateStockSummaryInput & { existingStockSummary: any }) {
    await this.prisma.$transaction(async (prisma) => {
      const { existingStockSummary, ...input } = cleanInput
      await prisma.stockTransaction.updateMany({
        where: {
          isDelete: false,
          symbol: existingStockSummary.symbol,
        },
        data: { isDelete: input.isDelete },
      })
      await prisma.stockSummary.update({
        where: { id: existingStockSummary.id },
        data: { isDelete: input.isDelete },
      })
    })
    return null
  }

  async findBy(where: Prisma.StockSummaryWhereInput) {
    return this.prisma.stockSummary.findMany({ where })
  }
}
