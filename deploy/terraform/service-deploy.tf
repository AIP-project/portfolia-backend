# aip-backend.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }

  backend "gcs" {}
}

provider "google" {
  project = var.gcpProjectId
  region  = var.gcpRegion
}

locals {
  configs = {
    staging = {
      cloud_run_instances = {
        min = 1
        max = 1
      }
      memory = "1Gi"
      cpu    = "1"
      domain = "staging-server.myasset.info"
      authorized_ips = [
        "0.0.0.0/0"
      ]
    }
    production = {
      cloud_run_instances = {
        min = 1
        max = 2
      }
      memory = "2Gi"
      cpu    = "2"
      domain = "server.myasset.info"
      authorized_ips = [
        "0.0.0.0/0"
      ]
    }
  }
  env_secrets = [
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_USERNAME",
    "DATABASE_PASSWORD",
    "DATABASE_NAME",
    "DATABASE_SYNCHRONIZE",
    "JWT_ACCESS_PRIVATE_KEY",
    "JWT_ACCESS_PUBLIC_KEY",
    "JWT_REFRESH_PRIVATE_KEY",
    "JWT_REFRESH_PUBLIC_KEY",
    "CRYPTO_SECRET_KEY",
    "CRYPTO_IV",
    "COIN_MARKET_CAP_API_KEY",
    "EXCHANGE_RATE_API_KEY",
    "REDIS_HOST"
  ]
}

variable "stage" {
  description = "배포 스테이지 (staging/production)"
  type        = string
}

variable "artifactUrl" {
  description = "Docker 이미지 태그"
  type        = string
}

variable "gcpProjectId" {
  description = "GCP 프로젝트 ID"
  type        = string
}

variable "gcpRegion" {
  description = "GCP 리전"
  type        = string
}

# Secret Manager에서 DATABASE_HOST 값을 가져옵니다
data "google_secret_manager_secret_version" "db_host" {
  secret = "${var.stage}-DATABASE_HOST"  # 시크릿 이름
  version = "latest"
}

locals {
  # 모든 /cloudsql/ 또는 // 접두사를 제거
  cloudsql_instance = regex(
    ".*/(.+:.+:.+)$",
    data.google_secret_manager_secret_version.db_host.secret_data
  )[
  0
  ]
}

# Cloud Run 서비스
resource "google_cloud_run_service" "default" {
  name     = "aip-backend-service-${var.stage}"
  location = var.gcpRegion

  template {
    spec {
      service_account_name = "aipproject-deploy@utopian-pier-424716-f8.iam.gserviceaccount.com"

      containers {
        image = var.artifactUrl

        resources {
          limits = {
            cpu    = local.configs[var.stage].cpu
            memory = local.configs[var.stage].memory
          }
        }

        env {
          name  = "PROJECT_ID"
          value = var.gcpProjectId
        }

        # Secret Manager 환경변수들을 동적으로 처리
        dynamic "env" {
          for_each = local.env_secrets
          content {
            name = env.value
            value_from {
              secret_key_ref {
                name = "${var.stage}-${env.value}"
                key  = "latest"
              }
            }
          }
        }
      }
    }

    metadata {
      name = "aip-backend-service-${var.stage}-${formatdate("YYYYMMDDhhmmss", timestamp())}"

      annotations = {
        "run.googleapis.com/cloudsql-instances"   = local.cloudsql_instance
        "run.googleapis.com/startup-probe-path"   = "/health"
        "run.googleapis.com/liveness-probe-path"  = "/health"
        "run.googleapis.com/readiness-probe-path" = "/health"
        "autoscaling.knative.dev/minScale"        = local.configs[var.stage].cloud_run_instances.min
        "autoscaling.knative.dev/maxScale"        = local.configs[var.stage].cloud_run_instances.max
        "run.googleapis.com/vpc-access-connector" = "aip-connector"
        "run.googleapis.com/vpc-access-egress"    = "private-ranges-only"
        "client.knative.dev/user-image"           = var.artifactUrl
        "run.googleapis.com/deployment-timestamp" = timestamp()
      }
    }
  }
}

# Load Balancer 구성요소들

# 외부 IP 주소
resource "google_compute_global_address" "default" {
  name = "aip-backend-ip-${var.stage}"
}

# SSL 인증서
resource "google_compute_managed_ssl_certificate" "default" {
  name = "aip-backend-cert-${var.stage}"
  lifecycle {
    create_before_destroy = true
  }
  managed {
    domains = [local.configs[var.stage].domain]
  }
}

# Cloud Run NEG (Network Endpoint Group)
resource "google_compute_region_network_endpoint_group" "serverless_neg" {
  name                  = "aip-backend-neg-${var.stage}"
  network_endpoint_type = "SERVERLESS"
  region                = var.gcpRegion
  cloud_run {
    service = google_cloud_run_service.default.name
  }
}

# 백엔드 서비스
resource "google_compute_backend_service" "default" {
  name = "aip-backend-backend-${var.stage}"

  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.serverless_neg.id
  }
}

# URL 맵
resource "google_compute_url_map" "default" {
  name            = "aip-backend-urlmap-${var.stage}"
  default_service = google_compute_backend_service.default.id
}

# HTTPS 프록시
resource "google_compute_target_https_proxy" "default" {
  name    = "aip-backend-https-proxy-${var.stage}"
  url_map = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
  lifecycle {
    create_before_destroy = true
  }
}

# HTTPS 포워딩 규칙
resource "google_compute_global_forwarding_rule" "https" {
  name       = "aip-backend-lb-https-${var.stage}"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

# IAM 정책 - Cloud Run 서비스에 대한 액세스 권한 설정
data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "serviceAccount:aipproject-deploy@utopian-pier-424716-f8.iam.gserviceaccount.com",
      "allUsers"
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location    = google_cloud_run_service.default.location
  project     = google_cloud_run_service.default.project
  service     = google_cloud_run_service.default.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

# Outputs
output "load_balancer_ip" {
  value = google_compute_global_address.default.address
}

output "service_url" {
  value = google_cloud_run_service.default.status[0].url
}

output "domain" {
  value = local.configs[var.stage].domain
}

output "ssl_certificate_provision_status" {
  value = google_compute_managed_ssl_certificate.default.certificate_id
}

