/** Read-only time check. Not wired into the TV device API until ownership mapping is implemented. */
export type TrialEntitlement={status:string;trial_ends_at:string|null};
export function isTrialCurrentlyActive(trial:TrialEntitlement|null,now=Date.now()):boolean{
 return !!trial && trial.status==='approved' && !!trial.trial_ends_at && Number.isFinite(Date.parse(trial.trial_ends_at)) && Date.parse(trial.trial_ends_at)>now;
}
