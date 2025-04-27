import { Injectable } from "@nestjs/common"
import { UpdateEtcSummaryInput } from "./dto"
import { AccountType, ErrorMessage, ForbiddenException, JwtPayload, UserRole, ValidationException } from "../common"
import { EtcSummary } from "./entities"
import { InjectRepository } from "@nestjs/typeorm"
import { Repository } from "typeorm"
import { Account } from "../account/entities/account.entity"

@Injectable()
export class EtcSummaryService {
  constructor(
    @InjectRepository(EtcSummary) private readonly etcSummaryRepository: Repository<EtcSummary>,
    @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
  ) {}

  async updateEtcSummary(jwtPayload: JwtPayload, updateEtcSummaryInput: UpdateEtcSummaryInput) {
    const cleanInput = await this.cleanUpdateEtcSummary(jwtPayload, updateEtcSummaryInput)
    return this.txUpdateEtcSummary(cleanInput)
  }

  private async cleanUpdateEtcSummary(jwtPayload: JwtPayload, updateEtcSummaryInput: UpdateEtcSummaryInput) {
    const existingEtcSummary = await this.etcSummaryRepository.findOne({
      where: { id: updateEtcSummaryInput.id },
    })
    if (!existingEtcSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_SUMMARY)

    const existingAccount = await this.accountRepository.findOne({
      where: { id: existingEtcSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.ETC) throw new ValidationException(ErrorMessage.MSG_NOT_ETC_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return { ...updateEtcSummaryInput, existingEtcSummary }
  }

  private async txUpdateEtcSummary(cleanInput: UpdateEtcSummaryInput & { existingEtcSummary: EtcSummary }) {
    return this.etcSummaryRepository.manager.transaction(async (manager) => {
      const { existingEtcSummary, ...input } = cleanInput

      const updatedEtcSummary = manager.merge(EtcSummary, existingEtcSummary, input)

      return await manager.save(EtcSummary, updatedEtcSummary)
    })
  }
}
