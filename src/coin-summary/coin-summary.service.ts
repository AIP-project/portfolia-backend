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
import { CoinSummariesArgs, UpdateCoinSummaryInput } from "./dto"
import { FindOptionsWhere, Repository } from "typeorm"
import { InjectRepository } from "@nestjs/typeorm"
import { Account } from "../account/entities/account.entity"
import { CoinSummary } from "./entities"
import { CoinTransaction } from "../coin-transaction/entities"

@Injectable()
export class CoinSummaryService {
  constructor(
    @InjectRepository(CoinSummary) private readonly coinSummaryRepository: Repository<CoinSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  async coinSummaries(jwtPayload: JwtPayload, coinSummariesArgs: CoinSummariesArgs) {
    const { page = 1, take = 10, sortBy, accountId } = coinSummariesArgs
    const skip = (page - 1) * take

    const existingAccount = await this.accountRepository.findOne({
      where: { id: accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    const whereConditions: FindOptionsWhere<CoinSummary> = {
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

    const [coinSummaries, total] = await this.coinSummaryRepository.findAndCount({
      where: whereConditions,
      skip,
      take,
      order,
    })

    const totalPages = Math.ceil(total / take)

    return {
      edges: coinSummaries,
      pageInfo: {
        total,
        page,
        take,
        hasNextPage: page < totalPages,
        totalPages,
      },
    }
  }

  async updateCoinSummary(jwtPayload: JwtPayload, updateCoinSummaryInput: UpdateCoinSummaryInput) {
    const cleanInput = await this.cleanUpdateCoinSummary(jwtPayload, updateCoinSummaryInput)
    if (cleanInput.isDelete) return this.txDeleteCoinSummary(cleanInput)
    else return this.txUpdateCoinSummary(cleanInput)
  }

  private async cleanUpdateCoinSummary(jwtPayload: JwtPayload, updateCoinSummaryInput: UpdateCoinSummaryInput) {
    const existingCoinSummary = await this.coinSummaryRepository.findOne({
      where: { id: updateCoinSummaryInput.id },
    })
    if (!existingCoinSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_COIN_SUMMARY)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: existingCoinSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.COIN) throw new ValidationException(ErrorMessage.MSG_NOT_COIN_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    let cleanInput: UpdateCoinSummaryInput

    if (existingCoinSummary.type === SummaryType.CASH) {
      cleanInput = {
        id: updateCoinSummaryInput.id,
        name: updateCoinSummaryInput.name,
        amount: updateCoinSummaryInput.amount,
        accountNumber: updateCoinSummaryInput.accountNumber,
      }
    } else {
      cleanInput = {
        id: updateCoinSummaryInput.id,
        amount: updateCoinSummaryInput.amount,
        quantity: updateCoinSummaryInput.quantity,
        isDelete: updateCoinSummaryInput.isDelete,
      }
    }

    return { ...cleanInput, existingCoinSummary }
  }

  private async txUpdateCoinSummary(cleanInput: UpdateCoinSummaryInput & { existingCoinSummary: CoinSummary }) {
    return this.coinSummaryRepository.manager.transaction(async (manager) => {
      const { existingCoinSummary, ...input } = cleanInput

      const updatedCoinSummary = manager.merge(CoinSummary, existingCoinSummary, input)

      return await manager.save(CoinSummary, updatedCoinSummary)
    })
  }

  private async txDeleteCoinSummary(cleanInput: UpdateCoinSummaryInput & { existingCoinSummary: CoinSummary }) {
    await this.coinSummaryRepository.manager.transaction(async (manager) => {
      const { existingCoinSummary, ...input } = cleanInput
      await manager.update(
        CoinTransaction,
        {
          isDelete: false,
          symbol: existingCoinSummary.symbol,
        },
        { isDelete: input.isDelete },
      )
      await manager.update(CoinSummary, { isDelete: false, id: existingCoinSummary.id }, { isDelete: input.isDelete })
    })
    return null
  }
}
