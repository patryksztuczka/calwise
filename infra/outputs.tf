output "zone_id" {
  value = data.cloudflare_zone.main.id
}

output "d1_database_id" {
  value = cloudflare_d1_database.main.id
}

output "pages_subdomain" {
  value = cloudflare_pages_project.web.subdomain
}

output "web_url" {
  value = "https://${var.web_hostname}"
}
