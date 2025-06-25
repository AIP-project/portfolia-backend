import { Injectable, Logger } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, parseISOString, ValidationException } from "../common"
import {
  CreateLiabilitiesTransactionInput,
  LiabilitiesTransactionInput,
  LiabilitiesTransactionsArgs,
  UpdateLiabilitiesTransactionInput,
} from "./dto"
import { PrismaService } from "../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"
import { AccountType, UserRole } from "@prisma/client"

@Injectable()
export class LiabilitiesTransactionService {
  private readonly logger = new Logger(LiabilitiesTransactionService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async commonCheckLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    liabilitiesTransactionInput: LiabilitiesTransactionInput,
  ) {
    const cleanInput = new LiabilitiesTransactionInput()
    if (liabilitiesTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (liabilitiesTransactionInput.remainingAmount && liabilitiesTransactionInput.remainingAmount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (liabilitiesTransactionInput.transactionDate) parseISOString(liabilitiesTransactionInput.transactionDate)

    if (liabilitiesTransactionInput.accountId) {
      const existingAccount = await this.prisma.account.findUnique({
        where: { id: liabilitiesTransactionInput.accountId },
      })
      if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
      if (existingAccount.type !== AccountType.LIABILITIES)
        throw new ValidationException(ErrorMessage.MSG_NOT_LIABILITIES_ACCOUNT)
      if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
        throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)
    }

    const existSummary = await this.prisma.liabilitiesSummary.findUnique({
      where: { accountId: liabilitiesTransactionInput.accountId },
    })

    if (!existSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_LIABILITIES_SUMMARY)

    return { ...liabilitiesTransactionInput, ...cleanInput, existSummary }
  }

  async createLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    createLiabilitiesTransactionInput: CreateLiabilitiesTransactionInput,
  ) {
    const cleanInput = await this.cleanLiabilitiesTransaction(jwtPayload, createLiabilitiesTransactionInput)
    return this.txCreateLiabilitiesTransaction(cleanInput)
  }

  private async cleanLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    createLiabilitiesTransactionInput: CreateLiabilitiesTransactionInput,
  ) {
    const cleanInput = await this.commonCheckLiabilitiesTransaction(jwtPayload, createLiabilitiesTransactionInput)

    cleanInput.existSummary.count = Number(cleanInput.existSummary.count) + 1
    cleanInput.existSummary.amount = new Decimal(Number(cleanInput.existSummary.amount) + Number(cleanInput.amount))
    cleanInput.existSummary.remainingAmount = new Decimal(
      Number(cleanInput.existSummary.remainingAmount) + Number(cleanInput.remainingAmount),
    )

    return { ...createLiabilitiesTransactionInput, ...cleanInput }
  }

  private async txCreateLiabilitiesTransaction(
    cleanInput: CreateLiabilitiesTransactionInput & {
      existSummary: any
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existSummary, ...input } = cleanInput

      const liabilitiesTransaction = await prisma.liabilitiesTransaction.create({ data: input })

      await prisma.liabilitiesSummary.update({
        where: { id: existSummary.id },
        data: {
          count: existSummary.count,
          amount: existSummary.amount,
          remainingAmount: existSummary.remainingAmount,
        },
      })

      return liabilitiesTransaction
    })
  }

  async liabilitiesTransactions(jwtPayload: JwtPayload, liabilitiesTransactionsArgs: LiabilitiesTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = liabilitiesTransactionsArgs
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

    const [liabilitiesTransactions, total] = await Promise.all([
      this.prisma.liabilitiesTransaction.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.liabilitiesTransaction.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: liabilitiesTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async liabilitiesTransaction(jwtPayload: JwtPayload, id: number) {
    const LiabilitiesTransaction = await this.prisma.liabilitiesTransaction.findFirst({
      where: { id: id, isDelete: false },
    })
    if (!LiabilitiesTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: LiabilitiesTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return LiabilitiesTransaction
  }

  async updateLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    updateLiabilitiesTransactionInput: UpdateLiabilitiesTransactionInput,
  ) {
    const cleanInput = await this.cleanUpdateLiabilitiesTransaction(jwtPayload, updateLiabilitiesTransactionInput)
    return this.txUpdateLiabilitiesTransaction(cleanInput)
  }

  private async cleanUpdateLiabilitiesTransaction(
    jwtPayload: JwtPayload,
    updateLiabilitiesTransactionInput: UpdateLiabilitiesTransactionInput,
  ) {
    const existingLiabilitiesTransaction = await this.prisma.liabilitiesTransaction.findFirst({
      where: { id: updateLiabilitiesTransactionInput.id, isDelete: false },
    })
    if (!existingLiabilitiesTransaction)
      throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_LIABILITIES_TRANSACTION)

    const cleanInput = await this.commonCheckLiabilitiesTransaction(jwtPayload, {
      ...updateLiabilitiesTransactionInput,
      accountId: existingLiabilitiesTransaction.accountId,
    })

    if (cleanInput.isDelete) {
      cleanInput.existSummary.count = Number(cleanInput.existSummary.count) - 1
      cleanInput.existSummary.amount = new Decimal(
        Number(cleanInput.existSummary.amount) - Number(existingLiabilitiesTransaction.amount),
      )
      cleanInput.existSummary.remainingAmount = new Decimal(
        Number(cleanInput.existSummary.remainingAmount) - Number(existingLiabilitiesTransaction.remainingAmount),
      )
    } else {
      cleanInput.existSummary.amount = new Decimal(
        Number(cleanInput.existSummary.amount) +
          Number(cleanInput.amount) -
          Number(existingLiabilitiesTransaction.amount),
      )
      cleanInput.existSummary.remainingAmount = new Decimal(
        Number(cleanInput.existSummary.remainingAmount) +
          Number(cleanInput.remainingAmount) -
          Number(existingLiabilitiesTransaction.remainingAmount),
      )
    }

    return { ...updateLiabilitiesTransactionInput, ...cleanInput, existingLiabilitiesTransaction }
  }

  private txUpdateLiabilitiesTransaction(
    cleanInput: UpdateLiabilitiesTransactionInput & {
      existSummary: any
    } & {
      existingLiabilitiesTransaction: any
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingLiabilitiesTransaction, existSummary, ...input } = cleanInput

      const liabilitiesTransaction = await prisma.liabilitiesTransaction.update({
        where: { id: existingLiabilitiesTransaction.id },
        data: input,
      })

      await prisma.liabilitiesSummary.update({
        where: { id: existSummary.id },
        data: {
          count: existSummary.count,
          amount: existSummary.amount,
          remainingAmount: existSummary.remainingAmount,
        },
      })

      return liabilitiesTransaction
    })
  }
}
