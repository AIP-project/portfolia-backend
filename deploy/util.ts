import * as shell from "shelljs"
import { col } from "./shell.color"

export const generateImageTag = (): string => {
  const branchCommand = "git rev-parse --abbrev-ref HEAD"
  const branchResult = shell.exec(branchCommand, { silent: true })

  if (branchResult.code !== 0) {
    shell.echo(`${col.fgRed("Failed to get git branch")}\n`)
    return "latest"
  }

  // 브랜치 이름에서 '/' 을 '-'로 변경
  const fullBranch = branchResult.stdout.trim()
  const branch = fullBranch.replace(/\//g, "-")

  return `${branch}`
}

export const getCommonEnv = (stage: string): Record<string, string> => {
  const gcpProjectId = "utopian-pier-424716-f8"
  const gcpArtifactRegistryId = "aipproject-backend"
  const gcpRegion = "asia-northeast3"
  const gcpArtifactUrl = `${gcpRegion}-docker.pkg.dev/${gcpProjectId}/${gcpArtifactRegistryId}-${stage}`
  const imageName = `${gcpArtifactRegistryId}:latest`
  const artifactUrl = `${gcpArtifactUrl}/${gcpArtifactRegistryId}:${generateImageTag()}`

  return {
    gcpProjectId,
    gcpArtifactRegistryId,
    gcpRegion,
    gcpArtifactUrl,
    imageName,
    artifactUrl,
  }
}