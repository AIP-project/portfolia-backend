import { Injectable, Logger } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, parseISOString, ValidationException } from "../../common"
import {
  CoinTransactionInput,
  CoinTransactionsArgs,
  CreateCoinTransactionInput,
  UpdateCoinTransactionInput,
} from "./inputs"
import { PrismaService } from "../../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"
import { AccountType, Prisma, SummaryType, TransactionType, UserRole } from "@prisma/client"

@Injectable()
export class CoinTransactionService {
  private readonly logger = new Logger(CoinTransactionService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async commonCheckCoinTransaction(jwtPayload: JwtPayload, coinTransactionInput: CoinTransactionInput) {
    const cleanInput = new CoinTransactionInput()
    if (coinTransactionInput.quantity < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (coinTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (coinTransactionInput.transactionDate) parseISOString(coinTransactionInput.transactionDate)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: coinTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.COIN) throw new ValidationException(ErrorMessage.MSG_NOT_COIN_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existCashSummary = await this.prisma.coinSummary.findFirst({
      where: { accountId: coinTransactionInput.accountId, type: SummaryType.CASH, isDelete: false },
    })

    if (!existCashSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_COIN_SUMMARY)
    cleanInput.currency = existCashSummary.currency

    const existCoinSummary = await this.prisma.coinSummary.findFirst({
      where: {
        accountId: coinTransactionInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: coinTransactionInput.symbol,
        currency: coinTransactionInput.currency,
        isDelete: false,
      },
    })

    if (existCoinSummary) {
      cleanInput.name = coinTransactionInput.name
    }

    const existSummary = {
      cash: existCashSummary,
      coin: existCoinSummary,
    }

    return {
      ...coinTransactionInput,
      ...cleanInput,
      existSummary,
    }
  }

  async createCoinTransaction(jwtPayload: JwtPayload, createCoinTransactionInput: CreateCoinTransactionInput) {
    const cleanInput = await this.cleanCreateCoinTransaction(jwtPayload, createCoinTransactionInput)
    return this.txCreateCoinTransaction(cleanInput)
  }

  private async cleanCreateCoinTransaction(
    jwtPayload: JwtPayload,
    createCoinTransactionInput: CreateCoinTransactionInput,
  ) {
    const cleanInput = await this.commonCheckCoinTransaction(jwtPayload, createCoinTransactionInput)

    const { existSummary, ...restCleanInput } = cleanInput
    const { coin: coinSummary, cash: cashSummary } = existSummary

    const sign = cleanInput.type === TransactionType.DEPOSIT ? 1 : -1

    const coinSummaryUpsertData: {
      where: Prisma.CoinSummaryWhereUniqueInput
      create: Prisma.CoinSummaryUncheckedCreateInput
      update: Prisma.CoinSummaryUncheckedUpdateInput
    } = {
      where: { id: coinSummary?.id || -1 },
      create: {
        accountId: restCleanInput.accountId,
        type: SummaryType.SUMMARY,
        symbol: restCleanInput.symbol,
        name: restCleanInput.name,
        slug: restCleanInput.slug,
        currency: restCleanInput.currency || cashSummary.currency, // currency 추가
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
      where: Prisma.CoinSummaryWhereUniqueInput
      data: Prisma.CoinSummaryUncheckedUpdateInput
    } = {
      where: { id: cashSummary.id },
      data: {
        amount: {
          increment: -sign * Number(restCleanInput.amount),
        },
      },
    }

    return {
      coinSummaryUpsertData,
      cashSummaryUpsertData,
      ...createCoinTransactionInput,
      ...restCleanInput,
    }
  }

  private async txCreateCoinTransaction(
    cleanInput: CreateCoinTransactionInput & {
      coinSummaryUpsertData: {
        where: Prisma.CoinSummaryWhereUniqueInput
        create: Prisma.CoinSummaryUncheckedCreateInput
        update: Prisma.CoinSummaryUncheckedUpdateInput
      }
      cashSummaryUpsertData: {
        where: Prisma.CoinSummaryWhereUniqueInput
        data: Prisma.CoinSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { coinSummaryUpsertData, cashSummaryUpsertData, ...input } = cleanInput

      const coinTransaction = await prisma.coinTransaction.create({
        data: input,
      })

      await prisma.coinSummary.upsert({
        where: coinSummaryUpsertData.where,
        update: coinSummaryUpsertData.update,
        create: coinSummaryUpsertData.create,
      })

      await prisma.coinSummary.update({
        where: cashSummaryUpsertData.where,
        data: cashSummaryUpsertData.data,
      })

      return coinTransaction
    })
  }

  async coinTransactions(jwtPayload: JwtPayload, coinTransactionsArgs: CoinTransactionsArgs) {
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
    } = coinTransactionsArgs
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
    if (note) whereConditions.note = { contains: note }
    if (type) whereConditions.type = type
    if (symbol) whereConditions.symbol = symbol
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

    // Order by 설정
    const orderBy =
      sortBy.length > 0
        ? sortBy.map(({ field, direction }) => ({
            [field]: direction ? "asc" : "desc",
          }))
        : [{ createdAt: "asc" }] // 기본 정렬

    const [coinTransactions, total] = await Promise.all([
      this.prisma.coinTransaction.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.coinTransaction.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: coinTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async coinTransaction(jwtPayload: JwtPayload, id: number) {
    const coinTransaction = await this.prisma.coinTransaction.findFirst({ where: { id: id, isDelete: false } })
    if (!coinTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_COIN_TRANSACTION)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: coinTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return coinTransaction
  }

  async updateCoinTransaction(jwtPayload: JwtPayload, updateCoinTransactionInput: UpdateCoinTransactionInput) {
    const cleanInput = await this.cleanUpdateCoinTransaction(jwtPayload, updateCoinTransactionInput)
    return this.txUpdateCoinTransaction(cleanInput)
  }

  private async cleanUpdateCoinTransaction(
    jwtPayload: JwtPayload,
    updateCoinTransactionInput: UpdateCoinTransactionInput,
  ) {
    const existingCoinTransaction = await this.prisma.coinTransaction.findFirst({
      where: { id: updateCoinTransactionInput.id, isDelete: false },
    })
    if (!existingCoinTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_COIN_TRANSACTION)

    const cleanInput = await this.commonCheckCoinTransaction(jwtPayload, {
      ...updateCoinTransactionInput,
      symbol: existingCoinTransaction.symbol,
      accountId: existingCoinTransaction.accountId,
    })

    const { existSummary, ...restCleanInput } = cleanInput
    const { coin: coinSummary, cash: cashSummary } = existSummary

    const sign = cleanInput.type || existingCoinTransaction.type === TransactionType.DEPOSIT ? 1 : -1
    const deleteSign = existingCoinTransaction.type === TransactionType.DEPOSIT ? -1 : 1

    const coinSummaryUpdateData: {
      where: Prisma.CoinSummaryWhereUniqueInput
      data: Prisma.CoinSummaryUncheckedUpdateInput
    } = {
      where: { id: coinSummary.id },
      data: {},
    }

    const cashSummaryUpdateData: {
      where: Prisma.CoinSummaryWhereUniqueInput
      data: Prisma.CoinSummaryUncheckedUpdateInput
    } = {
      where: { id: cashSummary.id },
      data: {},
    }

    if (restCleanInput.isDelete) {
      coinSummaryUpdateData.data = {
        quantity: {
          increment: deleteSign * Number(existingCoinTransaction.quantity),
        },
        amount: {
          increment: deleteSign * Number(existingCoinTransaction.amount),
        },
      }
      cashSummaryUpdateData.data = {
        amount: {
          increment: -deleteSign * Number(existingCoinTransaction.amount),
        },
      }
    } else {
      coinSummaryUpdateData.data = {
        quantity: {
          increment: sign * Number(restCleanInput.quantity) + deleteSign * Number(existingCoinTransaction.quantity),
        },
        amount: {
          increment: sign * Number(restCleanInput.amount) + deleteSign * Number(existingCoinTransaction.amount),
        },
      }
      cashSummaryUpdateData.data = {
        amount: {
          increment: -sign * Number(restCleanInput.amount) - deleteSign * Number(existingCoinTransaction.amount),
        },
      }
    }

    return { ...updateCoinTransactionInput, ...restCleanInput, coinSummaryUpdateData, cashSummaryUpdateData }
  }

  private txUpdateCoinTransaction(
    cleanInput: UpdateCoinTransactionInput & {
      coinSummaryUpdateData: {
        where: Prisma.CoinSummaryWhereUniqueInput
        data: Prisma.CoinSummaryUncheckedUpdateInput
      }
      cashSummaryUpdateData: {
        where: Prisma.CoinSummaryWhereUniqueInput
        data: Prisma.CoinSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { coinSummaryUpdateData, cashSummaryUpdateData, ...input } = cleanInput

      const coinTransaction = await prisma.coinTransaction.update({
        where: { id: input.id },
        data: input,
      })

      await prisma.coinSummary.update({
        where: coinSummaryUpdateData.where,
        data: coinSummaryUpdateData.data,
      })

      await prisma.coinSummary.update({
        where: cashSummaryUpdateData.where,
        data: cashSummaryUpdateData.data,
      })

      return coinTransaction
    })
  }
}
