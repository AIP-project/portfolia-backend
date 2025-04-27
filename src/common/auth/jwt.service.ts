import { Injectable, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { JwtService } from "@nestjs/jwt"
import {
  ErrorMessage,
  getErrorMessage,
  InternalServerException,
  JwtPayload,
  SecurityConfig,
  Token,
  TokenExpiredException,
  TokenType,
} from "../index"

@Injectable()
export class CustomJwtService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async generateTokens(payload: JwtPayload): Promise<Token> {
    const securityConfig = this.configService.get<SecurityConfig>("security")!
    return {
      accessToken: this.generateAccessToken(payload, securityConfig),
      refreshToken: this.generateRefreshToken(payload, securityConfig),
    }
  }

  private generateAccessToken(payload: JwtPayload, config: SecurityConfig): string {
    return this.jwtService.sign(
      { ...payload, type: "access" },
      {
        privateKey: config.jwtAccessPrivateKey!.replace(/\\n/g, "\n"),
        algorithm: "RS256",
        issuer: "aip_project",
        expiresIn: config.jwtAccessExpiresIn,
      },
    )
  }

  private generateRefreshToken(payload: JwtPayload, config: SecurityConfig): string {
    return this.jwtService.sign(
      { ...payload, type: "refresh" },
      {
        privateKey: config.jwtRefreshPrivateKey!.replace(/\\n/g, "\n"),
        algorithm: "RS256",
        issuer: "aip_project",
        expiresIn: config.jwtRefreshExpiresIn,
      },
    )
  }

  async verify(token: string, type: TokenType): Promise<JwtPayload> {
    const securityConfig = this.configService.get<SecurityConfig>("security")!
    let publicKey: string
    switch (type) {
      case TokenType.ACCESS:
        publicKey = securityConfig.jwtAccessPublicKey!.replace(/\\n/g, "\n")
        break
      case TokenType.REFRESH:
        publicKey = securityConfig.jwtRefreshPublicKey!.replace(/\\n/g, "\n")
        break
      default:
        throw new InternalServerException(ErrorMessage.MSG_INTERNAL_SERVER_ERROR)
    }
    let payload: JwtPayload | PromiseLike<JwtPayload>
    try {
      payload = this.jwtService.verify(token, {
        publicKey,
        algorithms: ["RS256"],
      })
    } catch (e) {
      const message = getErrorMessage(e)
      if (message === "jwt expired") throw new TokenExpiredException(ErrorMessage.MSG_TOKEN_EXPIRED)
      else {
        throw new UnauthorizedException(message)
      }
    }

    return payload
  }
}
