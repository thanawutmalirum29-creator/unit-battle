// db/accountStatus.js — shared logic for reading a player's account status
// (see routes/admin.js PATCH /players/:id for how it gets set).
//
// A timed suspension ('suspended' + suspended_until) is lifted lazily —
// same pattern as db/helperLoans.js's expired-loan sweep, no cron job — the
// next time the account is actually touched (login, or any authenticated
// request via middleware/auth.js) once suspended_until has passed. A ban has
// no suspended_until and stays in effect until an admin flips it back to
// 'active' by hand.

// `row` must be a players row (or a subset) containing at least:
// status, status_reason, status_changed_at, suspended_until
async function resolveAccountStatus(pool, playerId, row) {
  if (row.status === 'suspended' && row.suspended_until
      && new Date(row.suspended_until).getTime() <= Date.now()) {
    await pool.query(
      `UPDATE players SET status = 'active', status_reason = NULL, status_changed_at = NULL, suspended_until = NULL WHERE id = $1`,
      [playerId]
    );
    return { status: 'active', statusReason: null, statusChangedAt: null, suspendedUntil: null };
  }

  return {
    status: row.status,
    statusReason: row.status_reason ?? null,
    statusChangedAt: row.status_changed_at ?? null,
    suspendedUntil: row.suspended_until ?? null,
  };
}

// Shape used for every 403 "account not active" response — keeps
// middleware/auth.js and routes/auth.js (login + google) consistent so the
// client can render the same blocked-account popup regardless of which
// endpoint caught it.
function accountBlockedPayload(statusInfo) {
  return {
    error: `account ${statusInfo.status}`,
    accountStatus: statusInfo.status,
    reason: statusInfo.statusReason,
    changedAt: statusInfo.statusChangedAt,
    suspendedUntil: statusInfo.suspendedUntil,
  };
}

module.exports = { resolveAccountStatus, accountBlockedPayload };
