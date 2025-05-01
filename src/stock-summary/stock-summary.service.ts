import { Injectable } from "@nestjs/common"
import {
  AccountType,
  ErrorMessage,
  ForbiddenException,
  JwtPayload,
  SummaryType,
  UserRole,
  ValidationException,
} from "../common"
import { StockSummariesArgs, UpdateStockSummaryInput } from "./dto"
import { FindOptionsWhere, Repository } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { StockSummary } from "./entities"
import { StockTransaction } from "../stock-transaction/entities"

@Injectable()
export class StockSummaryService {
  constructor(
    @InjectRepository(StockSummary) private readonly stockSummaryRepository: Repository<StockSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  async stockSummaries(jwtPayload: JwtPayload, stockSummariesArgs: StockSummariesArgs) {
    const { page = 1, take = 10, sortBy, accountId } = stockSummariesArgs
    const skip = (page - 1) * take

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<StockSummary> = {
      accountId: accountId,
      type: SummaryType.SUMMARY,
      isDelete: false,
    }

    // Order by 설정
    const order =
      sortBy.length > 0
        ? sortBy.reduce(
            (acc, { field, direction }) => ({
              ...acc,
              [field]: direction ? "ASC" : "DESC",
            }),
            {},
          )
        : { createdAt: "ASC" } // 기본 정렬

    const [stockSummaries, total] = await this.stockSummaryRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

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
    const existingStockSummary = await this.stockSummaryRepository.findOne({
      where: { id: updateStockSummaryInput.id },
    })
    if (!existingStockSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_STOCK_SUMMARY)

    const existingAccount = await this.accountRepository.findOne({
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

  private async txUpdateStockSummary(cleanInput: UpdateStockSummaryInput & { existingStockSummary: StockSummary }) {
    return this.stockSummaryRepository.manager.transaction(async (manager) => {
      const { existingStockSummary, ...input } = cleanInput

      const updatedStockSummary = manager.merge(StockSummary, existingStockSummary, input)

      return await manager.save(StockSummary, updatedStockSummary)
    })
  }

  private async txDeleteStockSummary(cleanInput: UpdateStockSummaryInput & { existingStockSummary: StockSummary }) {
    await this.stockSummaryRepository.manager.transaction(async (manager) => {
      const { existingStockSummary, ...input } = cleanInput
      await manager.update(
        StockTransaction,
        {
          isDelete: false,
          symbol: existingStockSummary.symbol,
        },
        { isDelete: input.isDelete },
      )
      await manager.update(StockSummary, { isDelete: false, id: existingStockSummary.id }, { isDelete: input.isDelete })
    })
    return null
  }

  async totalStocks(stockSummary: StockSummary) {
    return this.stockSummaryRepository.find({
      where: { accountId: stockSummary.accountId, type: SummaryType.SUMMARY, isDelete: false },
    })
  }
}
