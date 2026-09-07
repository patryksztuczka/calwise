# Terraform for platform resources, wrangler for deployables

Terraform (Cloudflare provider 5.x) owns the long-lived resources that must exist before anything is deployed: the D1 database, the Pages project with its custom domain and DNS record, and the R2 bucket holding Terraform's own state (created once by `infra/bootstrap` with local state). wrangler owns everything it deploys: the Worker script and, through `routes[].custom_domain`, the `calwise-api.lastlab.win` custom domain, because a Terraform-managed Worker domain would require the script to exist first.

The Worker binds D1 by `database_name`, not `database_id`, so no generated identifier has to be copied from Terraform output into `wrangler.jsonc`.

State is in R2 through Terraform's S3 backend with the AWS-only checks disabled. There is no state locking; the manual `Infrastructure` workflow runs under a GitHub Actions concurrency group instead.
