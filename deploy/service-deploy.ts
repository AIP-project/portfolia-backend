import { execSync } from "child_process"
import * as path from "path"
import { getCommonEnv } from "./util"
import { TargetStage } from "./config"

// 간단한 컬러 헬퍼 함수들
import fs from "fs"

const colors = {
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
  magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
}

interface DeployConfig {
  stage: TargetStage
  artifactUrl: string
  gcpProjectId: string
  gcpRegion: string
}

class TerraformDeployer {
  private config: DeployConfig
  private readonly terraformDir: string
  private readonly title: string

  constructor(config: DeployConfig) {
    this.config = config
    this.terraformDir = path.join(__dirname, "./terraform")
    this.title = "Aip Project Backend Service Deploy"
  }

  async deploy() {
    try {
      console.log(colors.magenta(`[${this.config.stage}] ${this.title} Init 🏖`))

      // 0. GCP 인증 확인
      await this.checkGCPCredentials()

      // 1. Terraform 워크스페이스 정리 (선택사항)
      if (process.env.CLEAN_WORKSPACE === "true") {
        await this.cleanWorkspace()
      }

      // 2. Terraform 초기화
      await this.initTerraform()

      // 3. State Lock 상태 확인 및 해제
      await this.checkAndResolveLock()

      // 4. Plan 실행 (선택사항)
      if (process.env.TERRAFORM_PLAN === "true") {
        await this.planTerraform()
      }

      // 5. Apply 실행
      await this.applyTerraform()

      console.log(colors.green(`✅ ${this.config.stage} 환경 배포 완료! 🚀`))
    } catch (error: any) {
      console.error(colors.red(`❌ ${this.config.stage} 환경 배포 실패 😢`))
      throw error
    }
  }

  private async cleanWorkspace() {
    console.log(colors.yellow("🧹 Terraform 워크스페이스 정리 중..."))
    try {
      // .terraform 디렉토리 삭제
      const terraformCacheDir = path.join(this.terraformDir, '.terraform')
      if (fs.existsSync(terraformCacheDir)) {
        fs.rmSync(terraformCacheDir, { recursive: true, force: true })
        console.log(colors.cyan("   .terraform 디렉토리 삭제됨"))
      }

      // terraform.tfstate.backup 삭제 (선택사항)
      const backupFile = path.join(this.terraformDir, 'terraform.tfstate.backup')
      if (fs.existsSync(backupFile)) {
        fs.rmSync(backupFile)
        console.log(colors.cyan("   terraform.tfstate.backup 삭제됨"))
      }

      console.log(colors.green("✅ 워크스페이스 정리 완료"))
    } catch (error: any) {
      console.log(colors.yellow("⚠️ 워크스페이스 정리 중 일부 오류 발생 (계속 진행)"))
    }
  }

  private async checkGCPCredentials() {
    const credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (!credentials) {
      // 환경변수가 없을 경우 기본 키 파일의 절대 경로 설정
      const keyPath = path.resolve(__dirname, "./keys/gcp-depoly-key.json")

      // 키 파일 존재 여부 확인
      try {
        if (!fs.existsSync(keyPath)) {
          throw new Error(`GCP credentials file not found at ${keyPath}`)
        }
        process.env.GOOGLE_APPLICATION_CREDENTIALS = keyPath
        console.log(colors.cyan(`🔑 Using GCP credentials from: ${keyPath}`))
      } catch (error: any) {
        console.error(colors.red(`🚨 ${this.title} - GCP credentials file not found at ${keyPath}`))
        throw error
      }
    } else {
      console.log(colors.cyan(`🔑 Using GCP credentials from environment variable`))
    }
  }

  private async initTerraform() {
    console.log("Initializing the backend...")
    
    try {
      // 먼저 일반 init 시도
      this.execTerraform(`init -backend-config=${this.config.stage}.hcl`)
    } catch (error: any) {
      const errorMessage = error.stderr || error.stdout || error.toString()
      
      if (errorMessage.includes("Backend configuration changed")) {
        console.log(colors.yellow("🔄 백엔드 설정 변경이 감지되었습니다. 재구성을 시도합니다..."))
        
        try {
          // -reconfigure 옵션으로 재시도
          const result = this.execTerraform(`init -reconfigure -backend-config=${this.config.stage}.hcl`)
          console.log(result) // 성공 메시지 출력
          console.log(colors.green("✅ 백엔드 재구성이 완료되었습니다."))
        } catch (reconfigureError: any) {
          console.error(colors.red("❌ 백엔드 재구성 실패. 수동으로 처리가 필요합니다:"))
          console.log(colors.cyan(`terraform -chdir=${this.terraformDir} init -reconfigure -backend-config=${this.config.stage}.hcl`))
          console.log(colors.cyan(`또는`))
          console.log(colors.cyan(`terraform -chdir=${this.terraformDir} init -migrate-state -backend-config=${this.config.stage}.hcl`))
          throw reconfigureError
        }
      } else {
        // 다른 종류의 에러라면 그대로 throw
        throw error
      }
    }
  }

  private async checkAndResolveLock() {
    try {
      // terraform show 명령어로 lock 상태 확인
      this.execTerraform("show", false)
    } catch (error: any) {
      const errorMessage = error.stderr || error.stdout || error.toString()

      if (errorMessage.includes("state lock")) {
        console.log(colors.yellow("🔒 State lock 감지됨. 해제를 시도합니다..."))

        // Lock ID 추출
        const lockIdMatch = errorMessage.match(/ID:\s+(\d+)/)
        if (lockIdMatch) {
          const lockId = lockIdMatch[1]
          console.log(colors.yellow(`Lock ID: ${lockId}`))

          // 자동으로 lock 해제 시도
          try {
            this.execTerraform(`force-unlock -force ${lockId}`)
            console.log(colors.green("✅ State lock이 성공적으로 해제되었습니다."))
          } catch (unlockError: any) {
            console.error(colors.red("❌ 자동 lock 해제 실패. 수동으로 해제해주세요:"))
            console.log(colors.cyan(`terraform -chdir=${this.terraformDir} force-unlock ${lockId}`))
            throw unlockError
          }
        }
      } else {
        // lock 문제가 아닌 다른 에러라면 그대로 throw
        throw error
      }
    }
  }

  private async planTerraform() {
    console.log("📋 Terraform plan 실행 중...")
    const planArgs = this.buildTerraformArgs("plan")
    const result = this.execTerraform(planArgs)
    console.log(result) // Plan 결과 출력
  }

  private async applyTerraform() {
    console.log("🚀 Terraform apply 실행 중...")
    const applyArgs = this.buildTerraformArgs("apply -auto-approve")
    const result = this.execTerraform(applyArgs)
    console.log(result) // Apply 결과 출력
  }

  private buildTerraformArgs(command: string): string {
    const vars = [
      `artifactUrl=${this.config.artifactUrl}`,
      `gcpProjectId=${this.config.gcpProjectId}`,
      `gcpRegion=${this.config.gcpRegion}`,
      `stage=${this.config.stage}`,
    ]

    const varFlags = vars.map((v) => `-var="${v}"`).join(" ")
    return `${command} ${varFlags}`
  }

  private execTerraform(args: string, throwOnError: boolean = true): string {
    const command = `terraform -chdir=${this.terraformDir} ${args}`
    console.log(colors.gray(`📃 ${command}`))

    try {
      return execSync(command, {
        encoding: "utf8",
        stdio: "pipe", // pipe로 변경하여 에러 메시지를 캐치할 수 있도록
        timeout: 300000, // 5분 타임아웃
      })
    } catch (error: any) {
      if (throwOnError) {
        // stdio가 pipe일 때는 stderr를 직접 출력
        if (error.stderr) {
          console.error(error.stderr)
        }
        throw error
      }
      return ""
    }
  }
}

// 실행 부분
async function main() {
  const stageArg = process.argv[2]
  const title = "Aip Project Backend Service Deploy"

  if (!stageArg) {
    console.error(colors.red(`❌ ${title} 🚨 Stage is not defined`))
    console.log(colors.cyan("사용법: yarn service:deploy <stage>"))
    process.exit(1)
  }

  // TargetStage 타입 검증 및 캐스팅
  const validStages: TargetStage[] = [TargetStage.staging, TargetStage.prod]
  const stage = stageArg as TargetStage
  
  if (!validStages.includes(stage)) {
    console.error(colors.red(`❌ 지원하지 않는 stage입니다: ${stageArg}`))
    console.log(colors.cyan(`지원하는 stage: ${Object.values(TargetStage).join(', ')}`))
    process.exit(1)
  }

  try {
    // getCommonEnv를 사용하여 환경별 설정 가져오기
    const { artifactUrl, gcpProjectId, gcpRegion } = getCommonEnv(stage)

    const config: DeployConfig = {
      stage,
      artifactUrl,
      gcpProjectId,
      gcpRegion,
    }

    console.log(colors.cyan(`🔧 배포 설정:`))
    console.log(colors.gray(`   Stage: ${config.stage}`))
    console.log(colors.gray(`   GCP Project: ${config.gcpProjectId}`))
    console.log(colors.gray(`   GCP Region: ${config.gcpRegion}`))
    console.log(colors.gray(`   Artifact URL: ${config.artifactUrl}`))
    console.log()

    const deployer = new TerraformDeployer(config)
    await deployer.deploy()
    
    console.log(colors.magenta("Service Deploy Done 🏖️"))
  } catch (error: any) {
    console.error(colors.red(`❌ 배포 과정에서 오류가 발생했습니다:`))
    console.error(error)
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch((error: any) => {
    console.error(error)
    process.exit(1)
  })
}
