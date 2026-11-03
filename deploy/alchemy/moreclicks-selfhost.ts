// More Clicks fork settings for the `selfhost` stage. Kept out of
// alchemy.run.ts so upstream merges touch as little of the stack as possible.
// See docs/maintainers/moreclicks-selfhost.md.

/** The only hostname the selfhost stage serves; undefined for other stages. */
export const customDomainFor = (stage: string) =>
  stage === "selfhost" ? "seo.moreclicks.co.uk" : undefined;

/** Hostnames the stage's Access application covers besides workers.dev. */
export const extraAccessDomains = (stage: string) => {
  const domain = customDomainFor(stage);
  return domain ? [domain] : undefined;
};

/**
 * App Worker URL and limit settings. selfhost turns off workers.dev and
 * preview URLs (`url: false`) and, on Workers Paid, sets its limits so
 * rank-check workflows don't keep the Free allowance. Other self-host stages
 * may run on the Free plan, which rejects configurable CPU limits, so they get
 * the plan default.
 */
export const appWorkerLimits = (stage: string, selfHostPlan: boolean) => {
  if (stage === "selfhost") {
    return {
      url: false,
      limits: { cpuMs: 30_000, subrequests: 10_000 },
    } as const;
  }
  return selfHostPlan ? {} : { limits: { cpuMs: 300_000 } };
};
