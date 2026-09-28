# More Clicks self-hosting

The `moreclicks-selfhost` branch carries More Clicks customizations; `main` follows upstream. Fetch `upstream` and merge `upstream/main` into this branch, review the changes, run the relevant tests and build, then deploy using the upstream [Cloudflare guide](../docs/SELF_HOSTING_CLOUDFLARE.md). Do not automatically deploy upstream changes.

## Scheduled ranking checks

Scheduled checks call `runQueuedCheck` with `allowLiveFallback: false`. Provider failures, rejected submissions and queued tasks still pending after the polling window are reported as incomplete; completed results remain saved. They never automatically incur an additional instant check. Manual checks still use the instant API and incur its higher price.

This is a small fork-specific change in `RankCheckWorkflow.ts` plus a backwards-compatible option in `rankCheckPaths.ts`. Preserve it when merging upstream. The regression tests cover successful collection, provider failure, queue timeout and failed submission without live API calls.

## Deployment credentials

Use the upstream Cloudflare Access protection and restrict allowed users. Keep runtime credentials outside Git. The DataForSEO recovery reference is the More Clicks vault item “More Clicks — DataForSEO API”; never copy values into this document or CI logs.

Current deployment status and project migration evidence belong in the separate MoreClicksInfra workspace, not this public repository.
