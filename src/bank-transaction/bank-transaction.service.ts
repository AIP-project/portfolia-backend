import { Injectable, Logger } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, parseISOString, ValidationException } from "../common"
import {
  BankTransactionInput,
  BankTransactionsArgs,
  CreateBankTransactionInput,
  UpdateBankTransactionInput,
} from "./dto"
import { PrismaService } from "../common/prisma"
import { AccountType, Prisma, TransactionType, UserRole } from "@prisma/client"

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
    const cleanInput = await this.cleanCreateBankTransaction(jwtPayload, createBankTransactionInput)
    return this.txCreateBankTransaction(cleanInput)
  }

  private async cleanCreateBankTransaction(
    jwtPayload: JwtPayload,
    createBankTransactionInput: CreateBankTransactionInput,
  ) {
    const cleanInput = await this.commonCheckBankTransaction(jwtPayload, createBankTransactionInput)

    const { existSummary, ...restCleanInput } = cleanInput

    const sign = cleanInput.type === TransactionType.DEPOSIT ? 1 : -1

    const summaryUpdateData: {
      where: Prisma.BankSummaryWhereUniqueInput
      data: Prisma.BankSummaryUncheckedUpdateInput
    } = {
      where: { id: existSummary.id },
      data: {},
    }

    summaryUpdateData.data = {
      totalDepositAmount: {
        increment: cleanInput.type === TransactionType.DEPOSIT ? Number(cleanInput.amount) : 0,
      },
      totalWithdrawalAmount: {
        increment: cleanInput.type === TransactionType.DEPOSIT ? 0 : Number(cleanInput.amount),
      },
      balance: {
        increment: sign * Number(cleanInput.amount),
      },
    }

    return { ...createBankTransactionInput, ...restCleanInput, summaryUpdateData }
  }

  private async txCreateBankTransaction(
    cleanInput: CreateBankTransactionInput & {
      summaryUpdateData: {
        where: Prisma.BankSummaryWhereUniqueInput
        data: Prisma.BankSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { summaryUpdateData, ...input } = cleanInput
      const bankTransaction = await prisma.bankTransaction.create({ data: input })

      await prisma.bankSummary.update({
        where: summaryUpdateData.where,
        data: summaryUpdateData.data,
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
    // 기존 트랜잭션 조회
    const existingBankTransaction = await this.prisma.bankTransaction.findFirst({
      where: { id: updateBankTransactionInput.id, isDelete: false },
    })

    if (!existingBankTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_BANK_TRANSACTION)

    // 공통 체크 수행
    const cleanInput = await this.commonCheckBankTransaction(jwtPayload, {
      ...updateBankTransactionInput,
      accountId: existingBankTransaction.accountId,
    })

    const { existSummary, ...restCleanInput } = cleanInput

    // create와 동일한 구조로 summaryUpdateData 생성
    const summaryUpdateData: {
      where: Prisma.BankSummaryWhereUniqueInput
      data: Prisma.BankSummaryUncheckedUpdateInput
    } = {
      where: { id: existSummary.id },
      data: {},
    }

    // 기존 트랜잭션 타입과 금액
    const oldType = existingBankTransaction.type
    const oldAmount = Number(existingBankTransaction.amount)
    const newType = cleanInput.type || oldType // 타입이 없으면 기존 타입 유지
    const newAmount = Number(cleanInput.amount)

    if (cleanInput.isDelete) {
      // 삭제 케이스: 기존 트랜잭션만 롤백
      summaryUpdateData.data = {
        totalDepositAmount: {
          increment: oldType === TransactionType.DEPOSIT ? -oldAmount : 0,
        },
        totalWithdrawalAmount: {
          increment: oldType === TransactionType.DEPOSIT ? 0 : -oldAmount,
        },
        balance: {
          increment: oldType === TransactionType.DEPOSIT ? -oldAmount : oldAmount,
        },
      }
    } else {
      // 업데이트 케이스
      summaryUpdateData.data = {
        totalDepositAmount: {
          increment: newType === TransactionType.DEPOSIT ? newAmount - oldAmount : 0,
        },
        totalWithdrawalAmount: {
          increment: newType === TransactionType.DEPOSIT ? 0 : newAmount - oldAmount,
        },
        balance: {
          increment: newType === TransactionType.DEPOSIT ? newAmount - oldAmount : -newAmount + oldAmount,
        },
      }
    }

    return {
      ...updateBankTransactionInput,
      ...restCleanInput,
      summaryUpdateData,
    }
  }

  private async txUpdateBankTransaction(
    cleanInput: UpdateBankTransactionInput & {
      summaryUpdateData: {
        where: Prisma.BankSummaryWhereUniqueInput
        data: Prisma.BankSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { summaryUpdateData, ...input } = cleanInput

      // 1. Bank Transaction 업데이트
      const bankTransaction = await prisma.bankTransaction.update({
        where: { id: input.id },
        data: input,
      })

      // 2. Bank Summary 업데이트 (increment 사용)
      await prisma.bankSummary.update({
        where: summaryUpdateData.where,
        data: summaryUpdateData.data,
      })

      return bankTransaction
    })
  }
}
