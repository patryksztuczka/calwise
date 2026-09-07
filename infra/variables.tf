variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare account that owns every resource."
}

variable "zone_name" {
  type        = string
  description = "Existing Cloudflare zone that hosts the public hostnames."
  default     = "lastlab.win"
}

variable "web_hostname" {
  type        = string
  description = "Public hostname of the web app (Pages)."
  default     = "calwise.lastlab.win"
}

variable "pages_project_name" {
  type        = string
  description = "Pages project name. Also the project's *.pages.dev subdomain and the target of `wrangler pages deploy`."
  default     = "calwise"
}

variable "d1_database_name" {
  type        = string
  description = "D1 database name. Referenced by name from apps/api/wrangler.jsonc."
  default     = "calwise"
}

variable "production_branch" {
  type        = string
  description = "Git branch whose Pages deployments are production."
  default     = "master"
}
