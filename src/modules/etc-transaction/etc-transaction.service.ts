import { Injectable, Logger } from "@nestjs/common"
import { ErrorMessage, ForbiddenException, JwtPayload, parseISOString, ValidationException } from "../../common"
import {
  CreateEtcTransactionInput,
  EtcTransactionInput,
  EtcTransactionsArgs,
  UpdateEtcTransactionInput,
} from "./inputs"
import { PrismaService } from "../../common/prisma"
import { AccountType, Prisma, UserRole } from "@prisma/client"

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
    const cleanInput = await this.cleanCreateEtcTransaction(jwtPayload, createEtcTransactionInput)
    return this.txCreateEtcTransaction(cleanInput)
  }

  private async cleanCreateEtcTransaction(
    jwtPayload: JwtPayload,
    createEtcTransactionInput: CreateEtcTransactionInput,
  ) {
    const cleanInput = await this.commonCheckEtcTransaction(jwtPayload, createEtcTransactionInput)

    const { existSummary, ...restCleanInput } = cleanInput

    const summaryUpdateData: {
      where: Prisma.EtcSummaryWhereUniqueInput
      data: Prisma.EtcSummaryUncheckedUpdateInput
    } = {
      where: { id: existSummary.id },
      data: {
        count: {
          increment: 1,
        },
        purchasePrice: {
          increment: Number(cleanInput.purchasePrice),
        },
        currentPrice: {
          increment: cleanInput.currentPrice ? Number(cleanInput.currentPrice) : 0,
        },
      },
    }

    return { ...createEtcTransactionInput, ...restCleanInput, summaryUpdateData }
  }

  private async txCreateEtcTransaction(
    cleanInput: CreateEtcTransactionInput & {
      summaryUpdateData: {
        where: Prisma.EtcSummaryWhereUniqueInput
        data: Prisma.EtcSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { summaryUpdateData, ...input } = cleanInput
      const etcTransaction = await prisma.etcTransaction.create({ data: input })

      await prisma.etcSummary.update({
        where: summaryUpdateData.where,
        data: summaryUpdateData.data,
      })

      return etcTransaction
    })
  }

  async etcTransactions(jwtPayload: JwtPayload, etcTransactionsArgs: EtcTransactionsArgs) {
    const {
      page = 1,
      take = 10,
      sortBy = [],
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
    // 기존 트랜잭션 조회
    const existingEtcTransaction = await this.prisma.etcTransaction.findFirst({
      where: { id: updateEtcTransactionInput.id, isDelete: false },
    })

    if (!existingEtcTransaction) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_TRANSACTION)

    // 공통 체크 수행
    const cleanInput = await this.commonCheckEtcTransaction(jwtPayload, {
      ...updateEtcTransactionInput,
      accountId: existingEtcTransaction.accountId,
    })

    const { existSummary, ...restCleanInput } = cleanInput

    // increment 방식으로 summary 업데이트 데이터 생성
    const summaryUpdateData: {
      where: Prisma.EtcSummaryWhereUniqueInput
      data: Prisma.EtcSummaryUncheckedUpdateInput
    } = {
      where: { id: existSummary.id },
      data: {},
    }

    // 기존 트랜잭션 값들
    const oldPurchasePrice = Number(existingEtcTransaction.purchasePrice)
    const oldCurrentPrice = Number(existingEtcTransaction.currentPrice || 0)
    const newPurchasePrice = Number(cleanInput.purchasePrice)
    const newCurrentPrice = Number(cleanInput.currentPrice || 0)

    if (cleanInput.isDelete) {
      // 삭제 케이스: 기존 트랜잭션 값들을 차감
      summaryUpdateData.data = {
        count: {
          increment: -1,
        },
        purchasePrice: {
          increment: -oldPurchasePrice,
        },
        currentPrice: {
          increment: -oldCurrentPrice,
        },
      }
    } else {
      // 업데이트 케이스: 차이값만큼 증감
      summaryUpdateData.data = {
        purchasePrice: {
          increment: newPurchasePrice - oldPurchasePrice,
        },
        currentPrice: {
          increment: newCurrentPrice - oldCurrentPrice,
        },
      }
    }

    return {
      ...updateEtcTransactionInput,
      ...restCleanInput,
      summaryUpdateData,
    }
  }

  private async txUpdateEtcTransaction(
    cleanInput: UpdateEtcTransactionInput & {
      summaryUpdateData: {
        where: Prisma.EtcSummaryWhereUniqueInput
        data: Prisma.EtcSummaryUncheckedUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { summaryUpdateData, ...input } = cleanInput

      const etcTransaction = await prisma.etcTransaction.update({
        where: { id: input.id },
        data: input,
      })

      await prisma.etcSummary.update({
        where: summaryUpdateData.where,
        data: summaryUpdateData.data,
      })

      return etcTransaction
    })
  }
}
