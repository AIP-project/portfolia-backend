import { Injectable, Logger } from "@nestjs/common"
import {
  AccountType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  parseISOString,
  UserRole,
  ValidationException,
} from "../common"
import { CreateEtcTransactionInput, EtcTransactionInput, EtcTransactionsArgs, UpdateEtcTransactionInput } from "./dto"
import { PrismaService } from "../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"

@Injectable()
export class EtcTransactionService {
  private readonly logger = new Logger(EtcTransactionService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async commonCheckEtcTransaction(jwtPayload: JwtPayload, etcTransactionInput: EtcTransactionInput) {
    const cleanInput = new EtcTransactionInput()
    if (etcTransactionInput.purchasePrice < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (etcTransactionInput.currentPrice && etcTransactionInput.currentPrice < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (etcTransactionInput.transactionDate) parseISOString(etcTransactionInput.transactionDate)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: etcTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.ETC) throw new ValidationException(ErrorMessage.MSG_NOT_ETC_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existSummary = await this.prisma.etcSummary.findUnique({
      where: { accountId: etcTransactionInput.accountId },
    })

    if (!existSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ETC_SUMMARY)

    return { ...etcTransactionInput, ...cleanInput, existSummary }
  }

  async createEtcTransaction(jwtPayload: JwtPayload, createEtcTransactionInput: CreateEtcTransactionInput) {
    const cleanInput = await this.cleanEtcTransaction(jwtPayload, createEtcTransactionInput)
    return this.txCreateEtcTransaction(cleanInput)
  }

  private async cleanEtcTransaction(jwtPayload: JwtPayload, createEtcTransactionInput: CreateEtcTransactionInput) {
    const cleanInput = await this.commonCheckEtcTransaction(jwtPayload, createEtcTransactionInput)

    cleanInput.existSummary.count = Number(cleanInput.existSummary.count) + 1
    cleanInput.existSummary.purchasePrice = new Decimal(Number(cleanInput.existSummary.purchasePrice) + Number(cleanInput.purchasePrice))
    cleanInput.existSummary.currentPrice = new Decimal(Number(cleanInput.existSummary.currentPrice) + Number(cleanInput.currentPrice))

    return { ...createEtcTransactionInput, ...cleanInput }
  }

  private async txCreateEtcTransaction(cleanInput: CreateEtcTransactionInput & { existSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existSummary, ...input } = cleanInput

      const etcTransaction = await prisma.etcTransaction.create({ data: input })

      await prisma.etcSummary.update({
        where: { id: existSummary.id },
        data: {
          count: existSummary.count,
          purchasePrice: existSummary.purchasePrice,
          currentPrice: existSummary.currentPrice,
        },
      })

      return etcTransaction
    })
  }

  async etcTransactions(jwtPayload: JwtPayload, etcTransactionsArgs: EtcTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = etcTransactionsArgs
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

    const [etcTransactions, total] = await Promise.all([
      this.prisma.etcTransaction.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.etcTransaction.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: etcTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async etcTransaction(jwtPayload: JwtPayload, id: number) {
    const etcTransaction = await this.prisma.etcTransaction.findFirst({ where: { id: id, isDelete: false } })
    if (!etcTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: etcTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return etcTransaction
  }

  async updateEtcTransaction(jwtPayload: JwtPayload, updateEtcTransactionInput: UpdateEtcTransactionInput) {
    const cleanInput = await this.cleanUpdateEtcTransaction(jwtPayload, updateEtcTransactionInput)
    return this.txUpdateEtcTransaction(cleanInput)
  }

  private async cleanUpdateEtcTransaction(
    jwtPayload: JwtPayload,
    updateEtcTransactionInput: UpdateEtcTransactionInput,
  ) {
    const existingEtcTransaction = await this.prisma.etcTransaction.findFirst({
      where: { id: updateEtcTransactionInput.id, isDelete: false },
    })
    if (!existingEtcTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    const cleanInput = await this.commonCheckEtcTransaction(jwtPayload, {
      ...updateEtcTransactionInput,
      accountId: existingEtcTransaction.accountId,
    })

    if (cleanInput.isDelete) {
      cleanInput.existSummary.count = Number(cleanInput.existSummary.count) - 1
      cleanInput.existSummary.purchasePrice = new Decimal(Number(cleanInput.existSummary.purchasePrice) - Number(existingEtcTransaction.purchasePrice))
      cleanInput.existSummary.currentPrice = new Decimal(Number(cleanInput.existSummary.currentPrice) - Number(existingEtcTransaction.currentPrice))
    } else {
      cleanInput.existSummary.purchasePrice = new Decimal(Number(cleanInput.existSummary.purchasePrice) + Number(cleanInput.purchasePrice) - Number(existingEtcTransaction.purchasePrice))
      cleanInput.existSummary.currentPrice = new Decimal(Number(cleanInput.existSummary.currentPrice) + Number(cleanInput.currentPrice) - Number(existingEtcTransaction.currentPrice))
    }

    return { ...updateEtcTransactionInput, ...cleanInput, existingEtcTransaction }
  }

  private txUpdateEtcTransaction(
    cleanInput: UpdateEtcTransactionInput & { existSummary: any } & {
      existingEtcTransaction: any
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingEtcTransaction, existSummary, ...input } = cleanInput

      const etcTransaction = await prisma.etcTransaction.update({
        where: { id: existingEtcTransaction.id },
        data: input,
      })

      await prisma.etcSummary.update({
        where: { id: existSummary.id },
        data: {
          count: existSummary.count,
          purchasePrice: existSummary.purchasePrice,
          currentPrice: existSummary.currentPrice,
        },
      })

      return etcTransaction
    })
  }
}
