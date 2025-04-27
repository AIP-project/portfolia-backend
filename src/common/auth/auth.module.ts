import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { JwtModule } from "@nestjs/jwt"
import { CustomJwtService } from "./jwt.service"
import { SecurityConfig } from "../index"

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const securityConfig = configService.get<SecurityConfig>("security")!
        return {
          privateKey: securityConfig.jwtAccessPrivateKey!.replace(/\\n/g, "\n"),
          publicKey: securityConfig.jwtAccessPublicKey!.replace(/\\n/g, "\n"),
          signOptions: {
            expiresIn: securityConfig.jwtAccessExpiresIn,
            issuer: "Brave Company",
            algorithm: "RS256",
          },
        }
      },
    }),
  ],
  providers: [CustomJwtService],
  exports: [CustomJwtService],
})
export class AuthModule {}
