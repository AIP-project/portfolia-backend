import { Injectable } from "@nestjs/common"
import { UpdateEtcSummaryInput } from "./dto"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../common"
import { PrismaService } from "../common/prisma"
import { AccountType, Prisma, UserRole } from "@prisma/client"

@Injectable()
export class EtcSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async updateEtcSummary(jwtPayload: JwtPayload, updateEtcSummaryInput: UpdateEtcSummaryInput) {
    const cleanInput = await this.cleanUpdateEtcSummary(jwtPayload, updateEtcSummaryInput)
    return this.txUpdateEtcSummary(cleanInput)
  }

  private async cleanUpdateEtcSummary(jwtPayload: JwtPayload, updateEtcSummaryInput: UpdateEtcSummaryInput) {
    const existingEtcSummary = await this.prisma.etcSummary.findUnique({
      where: { id: updateEtcSummaryInput.id },
    })
    if (!existingEtcSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_SUMMARY)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: existingEtcSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.ETC) throw new ValidationException(ErrorMessage.MSG_NOT_ETC_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return { ...updateEtcSummaryInput, existingEtcSummary }
  }

  private async txUpdateEtcSummary(cleanInput: UpdateEtcSummaryInput & { existingEtcSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingEtcSummary, ...input } = cleanInput

      return prisma.etcSummary.update({
        where: { id: existingEtcSummary.id },
        data: input,
      })
    })
  }

  async findBy(where: Prisma.EtcSummaryWhereInput) {
    return this.prisma.etcSummary.findMany({ where })
  }
}
