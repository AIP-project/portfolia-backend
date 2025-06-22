import { Injectable, Logger } from "@nestjs/common"
import {
  AccountType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  parseISOString,
  TransactionType,
  UserRole,
  ValidationException,
} from "../common"
import {
  BankTransactionInput,
  BankTransactionsArgs,
  CreateBankTransactionInput,
  UpdateBankTransactionInput,
} from "./dto"
import { PrismaService } from "../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"

@Injectable()
export class BankTransactionService {
  private readonly logger = new Logger(BankTransactionService.name)

  constructor(private readonly prisma: PrismaService) {}

  private async commonCheckBankTransaction(jwtPayload: JwtPayload, bankTransactionInput: BankTransactionInput) {
    const cleanInput = new BankTransactionInput()
    if (bankTransactionInput.amount < 0)
      throw new ValidationException(ErrorMessage.MSG_AMOUNT_MUST_BE_GREATER_THAN_ZERO)

    if (bankTransactionInput.transactionDate) parseISOString(bankTransactionInput.transactionDate)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: bankTransactionInput.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.BANK) throw new ValidationException(ErrorMessage.MSG_NOT_BANK_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const existSummary = await this.prisma.bankSummary.findUnique({
      where: { accountId: bankTransactionInput.accountId },
    })

    if (!existSummary) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_BANK_SUMMARY)

    return { ...bankTransactionInput, ...cleanInput, existSummary }
  }

  async createBankTransaction(jwtPayload: JwtPayload, createBankTransactionInput: CreateBankTransactionInput) {
    const cleanInput = await this.cleanBankTransaction(jwtPayload, createBankTransactionInput)
    return this.txCreateBankTransaction(cleanInput)
  }

  private async cleanBankTransaction(jwtPayload: JwtPayload, createBankTransactionInput: CreateBankTransactionInput) {
    const cleanInput = await this.commonCheckBankTransaction(jwtPayload, createBankTransactionInput)

    if (cleanInput.type === TransactionType.DEPOSIT) {
      cleanInput.existSummary.totalDepositAmount = new Decimal(Number(cleanInput.existSummary.totalDepositAmount) + Number(cleanInput.amount))
      cleanInput.existSummary.balance = new Decimal(Number(cleanInput.existSummary.balance) + Number(cleanInput.amount))
    } else {
      cleanInput.existSummary.totalWithdrawalAmount = new Decimal(Number(cleanInput.existSummary.totalWithdrawalAmount) + Number(cleanInput.amount))
      cleanInput.existSummary.balance = new Decimal(Number(cleanInput.existSummary.balance) - Number(cleanInput.amount))
    }

    return { ...createBankTransactionInput, ...cleanInput }
  }

  private async txCreateBankTransaction(cleanInput: CreateBankTransactionInput & { existSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existSummary, ...input } = cleanInput
      const bankTransaction = await prisma.bankTransaction.create({ data: input })

      await prisma.bankSummary.update({
        where: {
          accountId: bankTransaction.accountId,
        },
        data: {
          totalDepositAmount: existSummary.totalDepositAmount,
          totalWithdrawalAmount: existSummary.totalWithdrawalAmount,
          balance: existSummary.balance,
        },
      })

      return bankTransaction
    })
  }

  async bankTransactions(jwtPayload: JwtPayload, bankTransactionsArgs: BankTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy,
      name,
      type,
      note,
      fromTransactionDate,
      toTransactionDate,
      accountId,
    } = bankTransactionsArgs
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

    const [bankTransactions, total] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: whereConditions,
        skip,
        take,
        orderBy,
      }),
      this.prisma.bankTransaction.count({ where: whereConditions }),
    ])

    const totalPages = Math.ceil(total / take)

    return {
      edges: bankTransactions,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async bankTransaction(jwtPayload: JwtPayload, id: number) {
    const bankTransaction = await this.prisma.bankTransaction.findFirst({ where: { id: id, isDelete: false } })
    if (!bankTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_TRANSACTION)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: bankTransaction.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return bankTransaction
  }

  async updateBankTransaction(jwtPayload: JwtPayload, updateBankTransactionInput: UpdateBankTransactionInput) {
    const cleanInput = await this.cleanUpdateBankTransaction(jwtPayload, updateBankTransactionInput)
    return this.txUpdateBankTransaction(cleanInput)
  }

  private async cleanUpdateBankTransaction(
    jwtPayload: JwtPayload,
    updateBankTransactionInput: UpdateBankTransactionInput,
  ) {
    const existingBankTransaction = await this.prisma.bankTransaction.findFirst({
      where: { id: updateBankTransactionInput.id, isDelete: false },
    })
    if (!existingBankTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_TRANSACTION)

    const cleanInput = await this.commonCheckBankTransaction(jwtPayload, {
      ...updateBankTransactionInput,
      accountId: existingBankTransaction.accountId,
    })

    if (cleanInput.isDelete) {
      if (existingBankTransaction.type === TransactionType.DEPOSIT) {
        cleanInput.existSummary.totalDepositAmount = new Decimal(Number(cleanInput.existSummary.totalDepositAmount) - Number(existingBankTransaction.amount))
        cleanInput.existSummary.balance = new Decimal(Number(cleanInput.existSummary.balance) - Number(existingBankTransaction.amount))
      } else {
        cleanInput.existSummary.totalWithdrawalAmount = new Decimal(Number(cleanInput.existSummary.totalWithdrawalAmount) - Number(existingBankTransaction.amount))
        cleanInput.existSummary.balance = new Decimal(Number(cleanInput.existSummary.balance) + Number(existingBankTransaction.amount))
      }
    } else {
      if (cleanInput.type === TransactionType.DEPOSIT) {
        cleanInput.existSummary.totalDepositAmount = new Decimal(Number(cleanInput.existSummary.totalDepositAmount) + Number(cleanInput.amount) - Number(existingBankTransaction.amount))
        cleanInput.existSummary.balance = new Decimal(Number(cleanInput.existSummary.balance) + Number(cleanInput.amount) - Number(existingBankTransaction.amount))
      } else {
        cleanInput.existSummary.totalWithdrawalAmount = new Decimal(Number(cleanInput.existSummary.totalWithdrawalAmount) + Number(cleanInput.amount) - Number(existingBankTransaction.amount))
        cleanInput.existSummary.balance = new Decimal(Number(cleanInput.existSummary.balance) - Number(cleanInput.amount) + Number(existingBankTransaction.amount))
      }
    }

    return { ...updateBankTransactionInput, ...cleanInput, existingBankTransaction }
  }

  private async txUpdateBankTransaction(
    cleanInput: UpdateBankTransactionInput & { existingBankTransaction: any } & {
      existSummary: any
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingBankTransaction, existSummary, ...input } = cleanInput

      const bankTransaction = await prisma.bankTransaction.update({
        where: { id: existingBankTransaction.id },
        data: input,
      })

      await prisma.bankSummary.update({
        where: {
          accountId: bankTransaction.accountId,
        },
        data: {
          totalDepositAmount: existSummary.totalDepositAmount,
          totalWithdrawalAmount: existSummary.totalWithdrawalAmount,
          balance: existSummary.balance,
        },
      })
      return bankTransaction
    })
  }
}
