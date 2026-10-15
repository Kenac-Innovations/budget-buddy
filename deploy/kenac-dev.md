# Deploy Budget Buddy at budgetbuddy.kenac.dev

Canonical public URL: https://budgetbuddy.kenac.dev. The target is the Kenac dev cluster, not the local default `kpc` context.

## Delivery

`.github/workflows/deploy.yml` verifies tests, types, lint and Helm on pull requests. On `main`, it publishes an immutable commit-SHA image to `ghcr.io/kenac-innovations/budget-buddy`, then updates `Kenac-Innovations/kenac-gitops` on `master`. Publishing uses the workflow's `GITHUB_TOKEN`; GitOps updates use the existing organization secrets `GITOPS_APP_ID` and `GITOPS_APP_PRIVATE_KEY`. The namespace needs the existing cluster `ghcr-secret` pull configuration, provisioned outside Git.

The chart source is `deploy/helm`. The pipeline copies it to `projects/budget-buddy/helm-chart`; environment overrides live at `projects/budget-buddy/environments/dev/values.yaml`. Argo CD Application `budget-buddy` watches that chart and deploys to namespace `budget-buddy`. Register its manifest from `argocd/applications/budget-buddy.yaml` in the GitOps repository on the dev cluster only. The first rollout requires the GitOps project files to exist before the pipeline updates them.

Use one replica initially: rate limits remain process-local. The rolling update briefly permits a second pod; increasing steady-state replicas requires shared rate limits and distributed turn coordination.

## Runtime configuration

Provision Secret `budget-buddy-env` outside Git. Required keys are `OPENAI_API_KEY`, `OPENAI_MODEL` and `DATABASE_URL`. Optional keys include `ADVISOR_REASONING_EFFORT`, `KENAC_VIEW_TOKEN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `MAIL_FROM`. The chart sets `ADVISOR_MODE=live` and `APP_URL=https://budgetbuddy.kenac.dev`. Never put secrets in chart values, workflow logs or commits.

Create a dedicated `budget_buddy` database and login on the existing CloudNativePG `postgres-ha` cluster in namespace `database`. The application role owns only its database and has no superuser, database-creation, role-creation or replication privileges. Use the primary service `postgres-ha-rw.database.svc:5432`. Revoke public access to the database. Keep the database outside app pruning so deleting the Argo application does not delete customer plans.

For TLS, mount the database CA certificate as Secret `budget-buddy-db-ca`, key `ca.crt`. The chart mounts it at `/app/certs/ca.crt` for both app and retention. Use connection parameters `schema=public&sslmode=verify-full&sslrootcert=/app/certs/ca.crt`. The image runs existing Prisma migrations before starting. Confirm the app can read and write its schema, and that backups include this database.

SMTP is optional for initial infrastructure checks; confirm a controlled save/email/return-link test before promising email delivery. The staff view requires its separate bearer token and exposes only shared lines. Live advisor acceptance still requires the release gates in `docs/release-notes-beta.md`.

## Public routing

The chart creates a hostname-specific Istio Gateway and VirtualService for `budgetbuddy.kenac.dev`, routing to `budget-buddy:80` with a 180-second timeout and no retry policy for streaming POSTs. Cloudflare terminates public TLS. Configure an explicit published route on the existing `kenac-dev` tunnel to `http://istio-gateway.istio-system.svc.cluster.local:80`, preserving the request host. Add the corresponding proxied DNS record and verify the edge certificate. Do not disable certificate validation or add wildcard routes.

## Verify and roll back

1. Run `helm lint deploy/helm` and render with the dev values.
2. Validate the rendered manifests with a server dry run against the supplied dev kubeconfig.
3. Confirm Argo is Synced/Healthy, the pod is Ready, and `/api/health` returns `ok:true`, `db:up`, `model:configured` over public HTTPS.
4. Smoke-test a real advisor reply, plan update, workbook export, save/return/delete, and retention. Do not log customer messages or contacts.
5. Roll back by reverting the GitOps image tag to the last healthy immutable image. Avoid rolling back schema migrations automatically. Remove the new Cloudflare hostname route/DNS only if disabling public access is intended.
