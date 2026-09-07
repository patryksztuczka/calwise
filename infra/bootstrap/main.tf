terraform {
  required_version = "~> 1.14.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.24.0"
    }
  }
}

provider "cloudflare" {}

variable "account_id" {
  type = string
}

resource "cloudflare_r2_bucket" "state" {
  account_id = var.account_id
  name       = "calwise-terraform-state"

  lifecycle {
    prevent_destroy = true
  }
}

resource "cloudflare_r2_managed_domain" "state" {
  account_id  = var.account_id
  bucket_name = cloudflare_r2_bucket.state.name
  enabled     = false
}

output "state_bucket" {
  value = cloudflare_r2_bucket.state.name
}
