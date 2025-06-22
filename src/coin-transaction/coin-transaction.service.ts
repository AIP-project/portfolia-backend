import { Injectable, Logger } from "@nestjs/common"
import {
  AccountType,
  CurrencyType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  parseISOString,
  SummaryType,
  TransactionType,
  UserRole,
  ValidationException,
} from "../common"
import {
  CoinTransactionInput,
  CoinTransactionsArgs,
  CreateCoinTransactionInput,
  UpdateCoinTransactionInput,
} from "./dto"
import { PrismaService } from "../common/prisma"
import { Decimal } from "@prisma/client/runtime/library"
import { Prisma } from "@prisma/client"

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
    cleanInput.currency = existCashSummary.currency as CurrencyType

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
      cleanInput.name = existCoinSummary.name
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
    // 1. 데이터 검증 및 DB 조작에 필요한 데이터 '준비'
    const preparedData = await this.cleanCoinTransaction(jwtPayload, createCoinTransactionInput);

    // 2. 준비된 데이터를 가지고 DB 트랜잭션 '실행'
    return this.txCreateCoinTransaction(preparedData);
  }

  private async cleanCoinTransaction(jwtPayload: JwtPayload, createCoinTransactionInput: CreateCoinTransactionInput) {
    // 1. 공통 유효성 검사 및 관련 데이터 조회
    const commonData = await this.commonCheckCoinTransaction(jwtPayload, createCoinTransactionInput)
    const { existSummary, ...transactionInputData } = commonData

    const sign = transactionInputData.type === TransactionType.DEPOSIT ? 1 : -1
    const quantityChange = new Decimal(sign * Number(transactionInputData.quantity))
    const amountChange = new Decimal(sign * Number(transactionInputData.amount))

    // 2. `upsert`에 필요한 create와 update 객체를 '미리' 정의
    // create 객체: 'existSummary.coin'이 없을 때 사용될 데이터
    const createPayload: Prisma.CoinSummaryCreateInput = {
      name: commonData.name,
      symbol: commonData.symbol,
      slug: commonData.slug,
      quantity: quantityChange, // 초기 생성 시 수량
      amount: amountChange, // 초기 생성 시 금액
      currency: commonData.currency,
      type: SummaryType.SUMMARY,
      account: {
        connect: {
          id: commonData.accountId, // 어떤 account에 연결할지 ID를 명시
        },
      },
    }

    // update 객체: 'existSummary.coin'이 있을 때 사용될 데이터
    const updatePayload: Prisma.CoinSummaryUpdateInput = {
      quantity: { increment: quantityChange }, // 원자적 연산으로 안전하게 값 증가/감소
      amount: { increment: amountChange },
    }

    // 3. `upsert`에 전달할 최종 객체 생성
    // 'existSummary.coin'이 있든 없든, where 조건은 동일하게 구성되어야 합니다.
    // symbol, currency 등은 createCoinTransactionInput에서 가져와야 합니다.
    const summaryToUpsert = {
      where: {
        accountId_type_symbol_currency: {
          accountId: transactionInputData.accountId,
          type: SummaryType.SUMMARY,
          symbol: transactionInputData.symbol,
          currency: commonData.currency,
        },
      },
      create: createPayload,
      update: updatePayload,
    }

    // 4. 다음 트랜잭션 함수에 필요한 모든 정보를 반환
    return {
      transactionInput: transactionInputData as Prisma.CoinTransactionCreateInput,
      summaryToUpsert,
    }
  }

  private async txCreateCoinTransaction(
    // cleanCoinTransaction의 반환 타입을 명시하여 타입 안정성 극대화
    cleanInput: {
      transactionInput: Prisma.CoinTransactionCreateInput
      summaryToUpsert: {
        where: Prisma.CoinSummaryWhereUniqueInput
        create: Prisma.CoinSummaryCreateInput
        update: Prisma.CoinSummaryUpdateInput
      }
    },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. 거래 내역 생성
      const coinTransaction = await prisma.coinTransaction.create({
        data: cleanInput.transactionInput,
      })

      // 2. 'cleanCoinTransaction'이 완벽하게 준비해준 객체로 upsert 실행
      // 더 이상 'existSummary.coin'을 사용하지 않으므로 타입 오류가 발생하지 않습니다.
      await prisma.coinSummary.upsert(cleanInput.summaryToUpsert)

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

    const sign = cleanInput.type || existingCoinTransaction.type === TransactionType.DEPOSIT ? 1 : -1
    const deleteSign = existingCoinTransaction.type === TransactionType.DEPOSIT ? -1 : 1

    const coinSummary = cleanInput.existSummary.coin

    if (cleanInput.isDelete) {
      coinSummary.quantity = new Decimal(
        Number(coinSummary.quantity) + deleteSign * Number(existingCoinTransaction.quantity),
      )
      coinSummary.amount = new Decimal(Number(coinSummary.amount) + deleteSign * Number(existingCoinTransaction.amount))
    } else {
      coinSummary.quantity = new Decimal(
        Number(coinSummary.quantity) +
          sign * Number(cleanInput.quantity) +
          deleteSign * Number(existingCoinTransaction.quantity),
      )
      coinSummary.amount = new Decimal(
        Number(coinSummary.amount) +
          sign * Number(cleanInput.amount) +
          deleteSign * Number(existingCoinTransaction.amount),
      )
    }

    return { ...updateCoinTransactionInput, ...cleanInput, existingCoinTransaction }
  }

  private txUpdateCoinTransaction(
    cleanInput: UpdateCoinTransactionInput & {
      existSummary: { cash: any; coin: any }
    } & { existingCoinTransaction: any },
  ) {
    return this.prisma.$transaction(async (prisma) => {
      const { existSummary, existingCoinTransaction, ...input } = cleanInput

      const coinTransaction = await prisma.coinTransaction.update({
        where: { id: existingCoinTransaction.id },
        data: input,
      })

      await prisma.coinSummary.upsert({
        where: {
          accountId_type_symbol_currency: {
            accountId: existSummary.coin.accountId,
            type: existSummary.coin.type,
            symbol: existSummary.coin.symbol,
            currency: existSummary.coin.currency,
          },
        },
        update: existSummary.coin,
        create: existSummary.coin,
      })

      return coinTransaction
    })
  }
}
