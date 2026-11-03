# More Clicks self-hosting

The `moreclicks-selfhost` branch carries More Clicks customizations; `main` follows upstream. Fetch `upstream` and merge a release tag (or `upstream/main`) into this branch through a reviewed PR, run the relevant tests and build, then deploy using the upstream [Cloudflare guide](../SELF_HOSTING_CLOUDFLARE.md). Do not automatically deploy upstream changes.

## Scheduled ranking checks

Since v0.1.15, upstream scheduled checks use only DataForSEO's task queue: there is no instant fallback. Pairs left without a usable result go to `retryRankChecks`, which resubmits them to the queue (queue price) up to `RETRY_ROUNDS` times. The run is then marked partial if any keyword is still missing.

More Clicks sets `extendedQueuePolling` on the check context for scheduled runs. Their queued polling, including each retry round, waits up to roughly one hour (plus request time) instead of upstream's 15 minutes, since provider backlog exceeded 15 minutes during verification. Collecting a result is free; leaving a task uncollected means a retry pays for it again. Manual checks keep upstream's instant API and 15-minute retry window.

This is a small fork-specific change in `RankCheckWorkflow.ts` and `rankCheckPaths.ts`. Preserve it when merging upstream. `rankCheckPaths.test.ts` covers a result collected after the 15-minute window without resubmitting.

## Deployment credentials

Use the upstream Cloudflare Access protection and restrict allowed users. Keep runtime credentials outside Git. The DataForSEO recovery reference is the More Clicks vault item “More Clicks — DataForSEO API”; never copy values into this document or CI logs.

Current deployment status and project migration evidence belong in the separate MoreClicksInfra workspace, not this public repository.

## Where deploys run

Deploys run from the maintainer's VM, not from CI. The VM holds an Alchemy Cloudflare login (the default profile) and the `.env.selfhost` file in its main checkout. Copy that file into the worktree you deploy from right before you plan, and never commit it. The deploy sets the Worker's secrets from this file, so a stale copy removes any secret added since. If the file is lost, rebuild it from the selfhost stage's Alchemy state with `pnpm alchemy state get --stack open-seo --stage selfhost --fqn open-seo`.

The env file sets no `AUTH_MODE`, so the stack keeps its `cloudflare_access` default. Upstream's example file now sets `AUTH_MODE=password` for new self-hosts. Don't copy that line into the More Clicks file.

Before a deploy, check that no audit or rank check is running, then run `pnpm alchemy plan deploy/alchemy/alchemy.run.ts --env-file .env.selfhost --stage selfhost`. The plan should delete nothing, leave `SelfHostAccess` and `SelfHostAllowUsers` unchanged, and change no secret you didn't mean to change. Then run `pnpm deploy:selfhost --yes`.

## Workers plan

The More Clicks `selfhost` stage requires Workers Paid. Its app Worker explicitly sets 30 seconds CPU and 10,000 subrequests per invocation in `deploy/alchemy/moreclicks-selfhost.ts`; other preview stages retain upstream defaults. Preserve this setting when merging upstream.

## Custom hostname

The `selfhost` stage serves only `seo.moreclicks.co.uk`. Its app Worker sets `url: false`, which disables workers.dev and preview URLs. Alchemy attaches the custom domain to the existing app Worker and includes it as a second destination on the existing Access application. The unused workers.dev Access destination is retained defensively without enabling that endpoint or changing the application audience. Preserve these settings when merging upstream; attaching a Worker domain alone does not configure Access.

Managed OAuth is configured through the Access API because this Alchemy version does not expose it. Verify it survives Access reconciliation, alongside the allowed identity, signed-out denial on the custom domain, and disabled workers.dev/preview endpoints. MCP clients use `https://seo.moreclicks.co.uk/mcp` and authenticate through Cloudflare Access. No data migration is needed for a hostname change.
