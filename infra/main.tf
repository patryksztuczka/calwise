variable "account_id" {
  type        = string
  description = "Cloudflare account ID."
}

variable "zone_id" {
  type        = string
  description = "Cloudflare zone ID for lastlab.win."
}

resource "cloudflare_d1_database" "calwise" {
  account_id = var.account_id
  name       = "calwise"

  lifecycle {
    prevent_destroy = true
  }
}

# Only the Worker identity belongs to Terraform. Wrangler owns code and bindings.
resource "cloudflare_worker" "api" {
  account_id = var.account_id
  name       = "calwise-api"
}

resource "cloudflare_workers_custom_domain" "api" {
  account_id = var.account_id
  zone_id    = var.zone_id
  hostname   = "calwise-api.lastlab.win"
  service    = cloudflare_worker.api.name
}

# No source integration: GitHub Actions performs direct uploads.
resource "cloudflare_pages_project" "web" {
  account_id        = var.account_id
  name              = "calwise"
  production_branch = "master"
}

resource "cloudflare_pages_domain" "web" {
  account_id   = var.account_id
  project_name = cloudflare_pages_project.web.name
  name         = "calwise.lastlab.win"
}

resource "cloudflare_dns_record" "web" {
  zone_id = var.zone_id
  name    = cloudflare_pages_domain.web.name
  type    = "CNAME"
  content = cloudflare_pages_project.web.subdomain
  proxied = true
  ttl     = 1
}

output "d1_database_id" {
  value = cloudflare_d1_database.calwise.id
}

output "frontend_url" {
  value = "https://${cloudflare_pages_domain.web.name}"
}

output "api_url" {
  value = "https://${cloudflare_workers_custom_domain.api.hostname}"
}
