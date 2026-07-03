// middleware/anticheat.js — server-side plausibility checks
// Tune these to match real game balance (min time a stage can possibly be cleared in).

const MIN_MS_PER_STAGE = 3000;     // fastest humanly/mechanically possible stage clear
const MAX_STAGE_JUMP = 1;          // stages must be cleared in order, one at a time
const MAX_RUNS_PER_MINUTE = 10;    // basic spam guard, also see rate-limit middleware

/**
 * Validates a "stage cleared" event against server-tracked run state.
 * Returns { ok: true } or { ok: false, reason }
 */
function validateStageClear(run, stage, now) {
  if (run.status !== 'active') return { ok: false, reason: 'run not active' };

  const expectedStage = run.max_stage + 1;
  if (stage !== expectedStage) {
    return { ok: false, reason: `stage out of order: expected ${expectedStage}, got ${stage}` };
  }

  // Stages actually fought in THIS run — when a run begins at a checkpoint
  // (run.start_stage > 0), the skipped stages must not count toward the
  // "minimum possible elapsed time" check below.
  const stagesIntoRun = stage - (run.start_stage || 0);

  const elapsedSinceStart = now - new Date(run.started_at).getTime();
  const minPossibleElapsed = stagesIntoRun * MIN_MS_PER_STAGE;
  if (elapsedSinceStart < minPossibleElapsed) {
    return { ok: false, reason: 'stage cleared faster than physically possible' };
  }

  return { ok: true };
}

module.exports = { validateStageClear, MIN_MS_PER_STAGE, MAX_STAGE_JUMP, MAX_RUNS_PER_MINUTE };
