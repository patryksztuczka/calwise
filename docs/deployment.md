# Deployment setup

Application hosting uses Cloudflare Pages, Workers, and D1 on the free plan. Terraform state uses a private R2 bucket. Nothing in this repository purchases a plan or enables paid add-ons.

## Ownership

| Resource                                                           | Owner                       |
| ------------------------------------------------------------------ | --------------------------- |
| D1 database, Worker identity, Pages project                        | Terraform                   |
| Frontend DNS and Pages custom domain                               | Terraform                   |
| Worker custom domain and its Cloudflare-managed DNS/certificate    | Terraform                   |
| Worker code, compatibility flags, D1 binding, workers.dev settings | Wrangler, backend workflow  |
| Pages static deployments                                           | Wrangler, frontend workflow |
| D1 tables and data migrations                                      | Backend workflow            |

Terraform uses `cloudflare_worker`, not `cloudflare_workers_script`, so an infrastructure apply cannot replace deployed application code. Don't add a competing Worker script/version resource. Don't add routes to Wrangler: Terraform owns the custom domain. The Pages project uses direct upload, with no Cloudflare Git integration or preview deployment workflow.

## 1. Bootstrap the state bucket

Install Terraform 1.14.x. Enable R2 on your account if necessary. Use a Cloudflare token scoped to this account with Workers R2 Storage edit permission, then run locally:

```sh
export CLOUDFLARE_API_TOKEN='your-bootstrap-token'
export TF_VAR_account_id='your-account-id'
terraform -chdir=infra/bootstrap init
terraform -chdir=infra/bootstrap plan
terraform -chdir=infra/bootstrap apply
```

This creates `calwise-terraform-state` and explicitly disables its public managed domain. Keep `infra/bootstrap/terraform.tfstate` in a secure backup, not Git. This small bootstrap stack uses local state because its bucket cannot store state before it exists. If the state is lost, import the existing bucket and managed-domain resource instead of creating them again.

Create R2 S3 credentials with Object Read & Write permission restricted to this bucket. They are separate from Cloudflare's API token. Keep the bucket private and do not configure lifecycle expiration for state files.

## 2. Configure GitHub

Add these repository Actions variables:

| Variable                | Value                        |
| ----------------------- | ---------------------------- |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID   |
| `CLOUDFLARE_ZONE_ID`    | The zone ID of `lastlab.win` |

Add these repository Actions secrets:

| Secret                      | Permissions                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `CLOUDFLARE_INFRA_TOKEN`    | Account Workers Scripts, D1, and Pages edit; zone DNS edit and Zone read for `lastlab.win` |
| `CLOUDFLARE_BACKEND_TOKEN`  | Account Workers Scripts and D1 edit                                                        |
| `CLOUDFLARE_FRONTEND_TOKEN` | Account Pages edit                                                                         |
| `R2_ACCESS_KEY_ID`          | Bucket-scoped S3 access key                                                                |
| `R2_SECRET_ACCESS_KEY`      | Matching S3 secret key                                                                     |

Scope account permissions to the Calwise account and zone permissions to `lastlab.win`. Tokens may also need Account Settings read for Wrangler account discovery. Never put token values in Terraform files or frontend environment variables.

Workflows only deploy from `master`. Configure repository branch rules if you want to require the Checks workflow before merging. The workflows run checks themselves before deploying even without branch protection.

## 3. Provision infrastructure manually

From GitHub Actions, run **Infrastructure** on `master` with operation `plan`. Review the output, then run it again with operation `apply`. Apply generates and applies its own plan from that run's checkout.

The workflow provisions the D1 database, Worker identity, Pages project, and both custom domains. It uses R2 state with S3 lockfiles and a GitHub concurrency group. Don't run a separate local apply while this workflow is active.

Cloudflare must already manage the active `lastlab.win` zone. If either subdomain or a named resource already exists, import it into Terraform before applying. Don't overwrite unrelated resources. Domain validation and certificate issuance may take time after creation.

For local Terraform access, export the same API and S3 credentials, plus:

```sh
export TF_VAR_account_id='your-account-id'
export TF_VAR_zone_id='your-zone-id'
export AWS_ENDPOINT_URL_S3="https://${TF_VAR_account_id}.r2.cloudflarestorage.com"
terraform -chdir=infra init -backend-config='bucket=calwise-terraform-state'
terraform -chdir=infra plan
```

## 4. First application deployments

After provisioning succeeds, manually run **Deploy backend** and **Deploy frontend** on `master`. These entry points also let you retry a release without creating an empty commit. A push made before credentials or infrastructure exist can fail; rerun after setup.

Each workflow runs formatting, linting, type checks, production builds, browser integration tests, and Terraform validation without deployment credentials. The frontend deploys the build artifact from those checks. The backend discovers the existing `calwise` D1 database by name, generates a production Wrangler configuration with its ID, applies migrations, and uploads the Worker.

The all-zero database ID in `apps/api/wrangler.json` is for local emulation and dry-run builds only. Production commands explicitly use the generated, ignored `wrangler.production.json`. Neither workflow needs access to Terraform state or an extra manually maintained D1 ID variable.

Check the frontend and API URLs after the first deployments. The page should show `Hello, world!` and `Connected to Cloudflare D1`.

## Routine releases

Relevant changes on `master` trigger the frontend and backend workflows separately. Shared dependencies can trigger both. Each component serializes its own releases without canceling an active release; neither waits for the other. GitHub may replace a pending run with a newer pending run.

Infrastructure changes require another manual Infrastructure run before application code that depends on them ships. Keep API contracts compatible across independently deployed frontend/backend versions.

Failures leave the usual red GitHub Actions status. There is no special failure handler or automatic rollback. A migration may have succeeded even if the later Worker upload failed.

For an explicit manual backend release from a trusted checkout:

```sh
export CLOUDFLARE_ACCOUNT_ID='your-account-id'
export CLOUDFLARE_API_TOKEN='your-backend-token'
export D1_DATABASE_ID='database-id-from-terraform-output'
pnpm cloudflare:config
pnpm db:migrate:remote
pnpm --filter @calwise/api deploy
```
