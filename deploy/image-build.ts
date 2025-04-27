import * as shell from "shelljs"
import { TargetStage } from "./config"
import { col } from "./shell.color"

const imageBuild = async () => {
  const stage = process.argv[2] as TargetStage
  let imageName: string = process.argv[3] as string
  const title = "Aip Project Backend Image Build"

  if (!imageName) {
    imageName = "aipproject-backend:latest"
  }

  if (!stage) {
    shell.echo(`${col.fgRed(String(title))} 🚨 Stage is not defined\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  shell.echo(`${col.fgMagenta(String(`[${stage}] ${title} Init 🏖`))}\n`)

  shell.echo(`${col.fgCyan(String(`[${stage}] ${title}`))} 🚀 NestJs Build\n`)

  const nestCommand = "yarn build"

  const nestResult = shell.exec(nestCommand)

  if (nestResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨 NestJs Build failed\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }
  shell.echo(`${col.fgGreen(String(`[${stage}] ${title}`))} 🌝 NestJs Build Success\n`)

  shell.echo(`${col.fgCyan(String(`[${stage}] ${title}`))} 🚀 Docker Build\n`)

  const buildArgs = [`--build-arg NODE_ENV=${stage}`, "--build-arg APP_PORT=80"].join(" ")

  const dockerCommand = `docker buildx build ${buildArgs} --load --platform linux/amd64 -t ${imageName} -f deploy/Dockerfile . --no-cache`

  shell.echo(`${col.fgYellow(`📃 ${dockerCommand}`)}\n`)

  const dockerResult = shell.exec(dockerCommand)

  if (dockerResult.code !== 0) {
    shell.echo(`${col.fgRed(String(title))} 🚨Docker Build failed\n`)
    process.exit(1) // 오류 발생 시 프로세스 종료 및 오류 코드 반환
  }

  shell.echo(`${col.fgGreen(String(`[${stage}] ${title}`))} 🌝 Docker Build Success\n`)
}

imageBuild().then(() => shell.echo(`${col.fgMagenta(String("Image Build Done 🏖️"))}\n`))
