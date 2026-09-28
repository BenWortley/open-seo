# More Clicks self-hosting

The `moreclicks-selfhost` branch carries More Clicks customizations; `main` follows upstream. Fetch `upstream` and merge `upstream/main` into this branch, review the changes, run the relevant tests and build, then deploy using the upstream [Cloudflare guide](../docs/SELF_HOSTING_CLOUDFLARE.md). Do not automatically deploy upstream changes.

## Scheduled ranking checks

Scheduled checks call `runQueuedCheck` with `allowLiveFallback: false`. Queued-only runs poll for up to roughly one hour (plus request time), since provider backlog exceeded the upstream 15-minute window during verification. Result collection is free and never resubmits paid tasks. Provider failures, rejected submissions and queued tasks still pending after the polling window are reported as incomplete; completed results remain saved. They never automatically incur an additional instant check. Manual checks still use the instant API and incur its higher price.

This is a small fork-specific change in `RankCheckWorkflow.ts` plus a backwards-compatible option in `rankCheckPaths.ts`. Preserve it when merging upstream. The regression tests cover successful collection, provider failure, queue timeout and failed submission without live API calls.

## Deployment credentials

Use the upstream Cloudflare Access protection and restrict allowed users. Keep runtime credentials outside Git. The DataForSEO recovery reference is the More Clicks vault item “More Clicks — DataForSEO API”; never copy values into this document or CI logs.

Current deployment status and project migration evidence belong in the separate MoreClicksInfra workspace, not this public repository.

## Workers plan

The More Clicks `selfhost` stage requires Workers Paid. Its app Worker explicitly sets 30 seconds CPU and 10,000 subrequests per invocation in `alchemy.run.ts`; other preview stages retain upstream defaults. Preserve this setting when merging upstream.

## Custom hostname

The `selfhost` stage serves `seo.moreclicks.co.uk`. Alchemy attaches the custom domain to the existing app Worker and includes it as a second destination on the existing Access application. The workers.dev address stays protected by the same allow-policy and audience. Preserve both destinations when merging upstream; attaching a Worker domain alone does not configure Access.

Managed OAuth is configured through the Access API because this Alchemy version does not expose it. Verify it survives Access reconciliation, alongside the allowed identity and signed-out denial on both hostnames. MCP clients use `https://seo.moreclicks.co.uk/mcp` and authenticate through Cloudflare Access. No data migration is needed for a hostname change.
