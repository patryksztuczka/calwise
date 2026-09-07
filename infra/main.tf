data "cloudflare_zone" "main" {
  filter = {
    name = var.zone_name
  }
}

# ---- Database -------------------------------------------------------------

resource "cloudflare_d1_database" "main" {
  account_id            = var.cloudflare_account_id
  name                  = var.d1_database_name
  primary_location_hint = "weur"

  # The API always reports this block; declaring it avoids a perpetual in-place update.
  read_replication = {
    mode = "disabled"
  }

  lifecycle {
    prevent_destroy = true
  }
}

# ---- Frontend (Pages) -----------------------------------------------------
#
# Deployments are pushed by CI with `wrangler pages deploy`, so the project has
# no git source or build configuration here.

resource "cloudflare_pages_project" "web" {
  account_id        = var.cloudflare_account_id
  name              = var.pages_project_name
  production_branch = var.production_branch
}

resource "cloudflare_pages_domain" "web" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.web.name
  name         = var.web_hostname
}

resource "cloudflare_dns_record" "web" {
  zone_id = data.cloudflare_zone.main.id
  name    = var.web_hostname
  type    = "CNAME"
  content = cloudflare_pages_project.web.subdomain
  proxied = true
  ttl     = 1
  comment = "Pages project ${cloudflare_pages_project.web.name} (managed by Terraform)"
}

# ---- Backend (Worker) -----------------------------------------------------
#
# The Worker script and its custom domain (calwise-api.lastlab.win) are owned by
# wrangler: `routes[].custom_domain: true` in apps/api/wrangler.jsonc creates the
# DNS record and certificate on first deploy. A Terraform-managed custom domain
# would need the script to exist first, which contradicts "infrastructure before
# the first deployment".
