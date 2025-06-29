import { Injectable, Logger } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, parseISOString, ValidationException } from "../common"
import {
  CreateStockTransactionInput,
  StockTransactionInput,
  StockTransactionsArgs,
  UpdateStockTransactionInput,
} from "./dto"
import { PrismaService } from "../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"
import { AccountType, CurrencyType, Prisma, SummaryType, TransactionType, UserRole } from "@prisma/client"
import { StockPriceHistoryService } from "../stock-price-history/stock-price-history.service"

@Injectable()
export class StockTransactionService {
  private readonly logger = new Logger(StockTransactionService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly stockPriceHistoryService: StockPriceHistoryService,
  ) {}

  private async commonCheckStockTransaction(jwtPayload: JwtPayload, stockTransactionInput: StockTransactionInput) {
    const cleanInput = new StockTransactionInput()
    if (stockTransactionInput.quantity < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (stockTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (stockTransactionInput.transactionDate) parseISOString(stockTransactionInput.transactionDate)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: stockTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.STOCK) throw new ValidationException(ErrorMessage.MSG_NOT_STOCK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existCashSummary = await this.prisma.stockSummary.findFirst({
      where: { accountId: stockTransactionInput.accountId, type: SummaryType.CASH, isDelete: false },
    })

    if (!existCashSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_STOCK_SUMMARY)

    const existStockSummary = await this.prisma.stockSummary.findFirst({
      where: {
        accountId: stockTransactionInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: stockTransactionInput.symbol,
        isDelete: false,
      },
    })

    if (existStockSummary) {
      cleanInput.name = stockTransactionInput.name
      cleanInput.currency = existStockSummary.currency
    }

    const existSummary = {
      cash: existCashSummary,
      stock: existStockSummary,
    }

    return {
      ...stockTransactionInput,
      ...cleanInput,
      existSummary,
    }
  }

  async createStockTransaction(jwtPayload: JwtPayload, createStockTransactionInput: CreateStockTransactionInput) {
    const cleanInput = await this.cleanCreateStockTransaction(jwtPayload, createStockTransactionInput)
    const { isUpdate, ...rest } = cleanInput
    const result = await this.txCreateStockTransaction(rest)

    // 비동기로 주식 정보 업데이트 처리
    this.postCreateStockTransaction(result, cleanInput.isUpdate).then((value) =>
      this.logger.debug(`Post create stock transaction: ${value}`),
    )

    return result
  }

  private async cleanCreateStockTransaction(
    jwtPayload: JwtPayload,
    createStockTransactionInput: CreateStockTransactionInput,
  ) {
    const cleanInput = await this.commonCheckStockTransaction(jwtPayload, createStockTransactionInput)
    const { existSummary, ...restCleanInput } = cleanInput
    const { stock: stockSummary, cash: cashSummary } = existSummary

    const isUpdate = !!stockSummary?.id
    const sign = cleanInput.type === TransactionType.DEPOSIT ? 1 : -1

    const stockSummaryUpsertData: {
      where: Prisma.StockSummaryWhereUniqueInput
      create: Prisma.StockSummaryUncheckedCreateInput
      update: Prisma.StockSummaryUncheckedUpdateInput
    } = {
      where: { id: stockSummary?.id || -1 },
      create: {
        accountId: restCleanInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: restCleanInput.symbol,
        name: restCleanInput.name,
        currency: restCleanInput.currency || cashSummary.currency,
        quantity: new Decimal(sign * Number(restCleanInput.quantity)),
        amount: new Decimal(sign * Number(restCleanInput.amount)),
      },
      update: {
        name: restCleanInput.name,
        quantity: {
          increment: sign * Number(restCleanInput.quantity),
        },
        amount: {
          increment: sign * Number(restCleanInput.amount),
        },
      },
    }

    const cashSummaryUpsertData: {
      where: Prisma.StockSummaryWhereUniqueInput
      data: Prisma.StockSummaryUncheckedUpdateInput
    } = {
      where: { id: cashSummary.id },
      data: {
        amount: {
          increment: -sign * Number(restCleanInput.amount),
        },
      },
    }

    return {
      stockSummaryUpsertData,
      cashSummaryUpsertData,
      isUpdate,
      ...createStockTransactionInput,
      ...restCleanInput,
    }
  }

  private async txCreateStockTransaction(
    cleanInput: CreateStockTransactionInput & {
      stockSummaryUpsertData: {
        where: Prisma.StockSummaryWhereUniqueInput
        create: Prisma.StockSummaryUncheckedCreateInput
        update: Prisma.StockSummaryUncheckedUpdateInput
      }
      cashSummaryUpsertData: {
        where: Prisma.StockSummaryWhereUniqueInput
        data: Prisma.StockSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { stockSummaryUpsertData, cashSummaryUpsertData, ...input } = cleanInput

      const stockTransaction = await prisma.stockTransaction.create({ data: input })

      await prisma.stockSummary.upsert({
        where: stockSummaryUpsertData.where,
        update: stockSummaryUpsertData.update,
        create: stockSummaryUpsertData.create,
      })

      await prisma.stockSummary.update({
        where: cashSummaryUpsertData.where,
        data: cashSummaryUpsertData.data,
      })

      return stockTransaction
    })
  }

  // 🔄 완전히 리팩토링된 postCreateStockTransaction 메서드
  private async postCreateStockTransaction(result: any, isUpdate: boolean): Promise<string> {
    const { symbol } = result

    if (!isUpdate) {
      try {
        // StockPriceHistoryService를 통해 주식 정보 조회
        const stockInfoResponse = await this.stockPriceHistoryService.getStockInfoBySymbol(symbol)

        if (stockInfoResponse.success && stockInfoResponse.stockInfo) {
          const updateData = this.stockPriceHistoryService.getUpdateDataFromStockInfo(stockInfoResponse.stockInfo)

          // StockSummary 업데이트
          const summaryUpdateResult = await this.prisma.stockSummary.updateMany({
            where: {
              symbol: symbol,
              isDelete: false,
            },
            data: updateData,
          })

          // StockTransaction 업데이트
          await this.prisma.stockTransaction.update({
            where: {
              id: result.id,
            },
            data: {
              currency: stockInfoResponse.stockInfo.currency as CurrencyType,
            },
          })

          this.logger.log(
            `Successfully updated stock info for symbol "${symbol}". Updated ${summaryUpdateResult.count} stock summaries.`,
          )
          return "success"
        } else {
          this.logger.warn(`Failed to get stock info for symbol "${symbol}": ${stockInfoResponse.error}`)
          return "fail"
        }
      } catch (error) {
        this.logger.error(`Exception caught while updating stock info for symbol "${symbol}": ${error.message}`)
        return "error"
      }
    }

    return "No need to search"
  }

  // 나머지 메서드들은 기존과 동일
  async stockTransactions(jwtPayload: JwtPayload, stockTransactionsArgs: StockTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      symbol,
      type,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = stockTransactionsArgs
    const skip = (page - 1) * take

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: any = {
      isDelete: false,
      accountId,
    }

    if (name) whereConditions.name = { contains: name }
    if (symbol) whereConditions.symbol = symbol
    if (note) whereConditions.note = { contains: note }
    if (type) whereConditions.type = type
    if (fromTransactionDate && toTransactionDate) {
      whereConditions.transactionDate = {
        gte: new Date(fromTransactionDate),
        lte: new Date(toTransactionDate),
      }
    } else if (fromTransactionDate) {
      whereConditions.transactionDate = { gte: new Date(fromTransactionDate) }
    } else if (toTransactionDate) {
      whereConditions.transactionDate = { lte: new Date(toTransactionDate) }
    }

    const orderBy =
      sortBy.length > 0
        ? sortBy.map(({ field, direction }) => ({
            [field]: direction ? "asc" : "desc",
          }))
        : [{ createdAt: "asc" }]

    const [stockTransactions, total] = await Promise.all([
      this.prisma.stockTransaction.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.stockTransaction.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: stockTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async stockTransaction(jwtPayload: JwtPayload, id: number) {
    const stockTransaction = await this.prisma.stockTransaction.findFirst({ where: { id: id, isDelete: false } })
    if (!stockTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_TRANSACTION)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: stockTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return stockTransaction
  }

  async updateStockTransaction(jwtPayload: JwtPayload, updateStockTransactionInput: UpdateStockTransactionInput) {
    const cleanInput = await this.cleanUpdateStockTransaction(jwtPayload, updateStockTransactionInput)
    return this.txUpdateStockTransaction(cleanInput)
  }

  private async cleanUpdateStockTransaction(
    jwtPayload: JwtPayload,
    updateStockTransactionInput: UpdateStockTransactionInput,
  ) {
    const existingStockTransaction = await this.prisma.stockTransaction.findFirst({
      where: { id: updateStockTransactionInput.id, isDelete: false },
    })
    if (!existingStockTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_TRANSACTION)

    const cleanInput = await this.commonCheckStockTransaction(jwtPayload, {
      ...updateStockTransactionInput,
      symbol: existingStockTransaction.symbol,
      accountId: existingStockTransaction.accountId,
    })

    const { existSummary, ...restCleanInput } = cleanInput
    const { stock: stockSummary, cash: cashSummary } = existSummary

    const sign = cleanInput.type || existingStockTransaction.type === TransactionType.DEPOSIT ? 1 : -1
    const deleteSign = existingStockTransaction.type === TransactionType.DEPOSIT ? -1 : 1

    const stockSummaryUpdateData: {
      where: Prisma.StockSummaryWhereUniqueInput
      data: Prisma.StockSummaryUncheckedUpdateInput
    } = {
      where: { id: stockSummary.id },
      data: {},
    }

    const cashSummaryUpdateData: {
      where: Prisma.StockSummaryWhereUniqueInput
      data: Prisma.StockSummaryUncheckedUpdateInput
    } = {
      where: { id: cashSummary.id },
      data: {},
    }

    if (restCleanInput.isDelete) {
      stockSummaryUpdateData.data = {
        quantity: {
          increment: deleteSign * Number(existingStockTransaction.quantity),
        },
        amount: {
          increment: deleteSign * Number(existingStockTransaction.amount),
        },
      }
      cashSummaryUpdateData.data = {
        amount: {
          increment: -deleteSign * Number(existingStockTransaction.amount),
        },
      }
    } else {
      stockSummaryUpdateData.data = {
        quantity: {
          increment: sign * Number(restCleanInput.quantity) + deleteSign * Number(existingStockTransaction.quantity),
        },
        amount: {
          increment: sign * Number(restCleanInput.amount) + deleteSign * Number(existingStockTransaction.amount),
        },
      }
      cashSummaryUpdateData.data = {
        amount: {
          increment: -sign * Number(restCleanInput.amount) - deleteSign * Number(existingStockTransaction.amount),
        },
      }
    }

    return { ...updateStockTransactionInput, ...restCleanInput, stockSummaryUpdateData, cashSummaryUpdateData }
  }

  private txUpdateStockTransaction(
    cleanInput: UpdateStockTransactionInput & {
      stockSummaryUpdateData: {
        where: Prisma.StockSummaryWhereUniqueInput
        data: Prisma.StockSummaryUncheckedUpdateInput
      }
      cashSummaryUpdateData: {
        where: Prisma.StockSummaryWhereUniqueInput
        data: Prisma.StockSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { stockSummaryUpdateData, cashSummaryUpdateData, ...input } = cleanInput

      const stockTransaction = await prisma.stockTransaction.update({
        where: { id: input.id },
        data: input,
      })

      await prisma.stockSummary.update({
        where: stockSummaryUpdateData.where,
        data: stockSummaryUpdateData.data,
      })

      await prisma.stockSummary.update({
        where: cashSummaryUpdateData.where,
        data: cashSummaryUpdateData.data,
      })

      return stockTransaction
    })
  }
}
