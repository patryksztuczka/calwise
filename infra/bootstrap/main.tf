# Run once, by hand, before the main configuration: creates the private R2
# bucket that holds the Terraform state. This module keeps local state on
# purpose (it manages a single bucket; re-import it if the local state is lost):
#
#   cd infra/bootstrap
#   export CLOUDFLARE_API_TOKEN=... TF_VAR_cloudflare_account_id=...
#   terraform init && terraform apply
#
# Then create an R2 API token (Object Read & Write, scoped to the bucket) and
# store its key pair as the R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY repository
# secrets used by .github/workflows/infra.yml.

terraform {
  required_version = ">= 1.10"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.24"
    }
  }
}

provider "cloudflare" {}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account that owns the state bucket."
}

variable "state_bucket_name" {
  type        = string
  description = "Name of the R2 bucket holding Terraform state."
  default     = "calwise-terraform-state"
}

resource "cloudflare_r2_bucket" "terraform_state" {
  account_id    = var.cloudflare_account_id
  name          = var.state_bucket_name
  location      = "weur"
  storage_class = "Standard"

  lifecycle {
    prevent_destroy = true
  }
}

output "state_bucket_name" {
  value = cloudflare_r2_bucket.terraform_state.name
}
