import { Injectable } from "@nestjs/common"
import { UpdateLiabilitiesSummaryInput } from "./inputs"
import { ErrorMessage, ForbiddenException, JwtPayload, ValidationException } from "../../common"
import { PrismaService } from "../../common/prisma"
import { AccountType, Prisma, UserRole } from "@prisma/client"

@Injectable()
export class LiabilitiesSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async updateLiabilitiesSummary(jwtPayload: JwtPayload, updateLiabilitiesSummaryInput: UpdateLiabilitiesSummaryInput) {
    const cleanInput = await this.cleanUpdateEtcSummary(jwtPayload, updateLiabilitiesSummaryInput)
    return this.txUpdateEtcSummary(cleanInput)
  }

  private async cleanUpdateEtcSummary(
    jwtPayload: JwtPayload,
    updateLiabilitiesSummaryInput: UpdateLiabilitiesSummaryInput,
  ) {
    const existingLiabilitiesSummary = await this.prisma.liabilitiesSummary.findUnique({
      where: { id: updateLiabilitiesSummaryInput.id },
    })
    if (!existingLiabilitiesSummary) throw new ForbiddenException(ErrorMessage.MSG_NOT_FOUND_ETC_SUMMARY)

    const existingAccount = await this.prisma.account.findUnique({
      where: { id: existingLiabilitiesSummary.accountId },
    })
    if (!existingAccount) throw new ValidationException(ErrorMessage.MSG_NOT_FOUND_ACCOUNT)
    if (existingAccount.type !== AccountType.LIABILITIES)
      throw new ValidationException(ErrorMessage.MSG_NOT_LIABILITIES_ACCOUNT)
    if (existingAccount.userId !== jwtPayload.id && jwtPayload.role !== UserRole.ADMIN)
      throw new ForbiddenException(ErrorMessage.MSG_FORBIDDEN_ERROR)

    return { ...updateLiabilitiesSummaryInput, existingLiabilitiesSummary: existingLiabilitiesSummary }
  }

  private async txUpdateEtcSummary(cleanInput: UpdateLiabilitiesSummaryInput & { existingLiabilitiesSummary: any }) {
    return this.prisma.$transaction(async (prisma) => {
      const { existingLiabilitiesSummary, ...input } = cleanInput

      return prisma.liabilitiesSummary.update({
        where: { id: existingLiabilitiesSummary.id },
        data: input,
      })
    })
  }

  async findBy(where: Prisma.LiabilitiesSummaryWhereInput) {
    return this.prisma.liabilitiesSummary.findMany({ where })
  }
}
