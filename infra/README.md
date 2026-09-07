# Infrastructure

Terraform (Cloudflare provider 5.x) owns the long-lived platform resources; wrangler owns what it deploys.

| Resource                                         | Owner     | Where                                |
| ------------------------------------------------ | --------- | ------------------------------------ |
| R2 bucket for Terraform state                    | Terraform | `bootstrap/` (run once, local state) |
| D1 database `calwise`                            | Terraform | `main.tf`                            |
| Pages project `calwise` + `calwise.lastlab.win`  | Terraform | `main.tf`                            |
| Worker `calwise-api` + `calwise-api.lastlab.win` | wrangler  | `apps/api/wrangler.jsonc` on deploy  |

## One-time bootstrap

1. Create a Cloudflare API token with: Account → D1 Edit, Workers Scripts Edit, Workers R2 Storage Edit, Cloudflare Pages Edit; Zone (`lastlab.win`) → Zone Read, DNS Edit, Workers Routes Edit, SSL and Certificates Edit.
2. Create the state bucket:

   ```sh
   cd infra/bootstrap
   export CLOUDFLARE_API_TOKEN=... TF_VAR_cloudflare_account_id=...
   terraform init && terraform apply
   ```

3. In the dashboard, create an R2 API token (Object Read & Write, bucket `calwise-terraform-state`) and note its access key pair.
4. Add repository secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `BETTER_AUTH_SECRET` (any long random string, for example `openssl rand -base64 32`; the Deploy API workflow pushes it to the Worker).
5. Run the **Infrastructure** workflow (Actions → Infrastructure → Run workflow) with `plan`, then with `apply`.

Only after the apply succeeds should the first application deployments run: the Worker binds D1 by name and Pages deploys need the project to exist.

## Local runs

```sh
cp infra/backend.hcl.example infra/backend.hcl   # fill in the endpoint and R2 keys
export CLOUDFLARE_API_TOKEN=... TF_VAR_cloudflare_account_id=...
terraform -chdir=infra init -backend-config=backend.hcl
terraform -chdir=infra plan
```

The workflow is the normal path for `apply`; local applies are for recovery only.
