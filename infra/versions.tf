terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.24"
    }
  }

  # State lives in the private R2 bucket created by infra/bootstrap. R2 speaks
  # the S3 API, so the S3 backend is used with the AWS-specific checks disabled.
  # The account-specific endpoint and the R2 key pair are supplied at init time
  # (see .github/workflows/infra.yml and infra/README.md).
  backend "s3" {
    bucket                      = "calwise-terraform-state"
    key                         = "calwise/terraform.tfstate"
    region                      = "auto"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
    skip_s3_checksum            = true
    use_path_style              = true
  }
}

# Reads CLOUDFLARE_API_TOKEN from the environment.
provider "cloudflare" {}
