// middleware/auth.js — PIN-based session auth for economy endpoints.
// Money/bag/deck matter for real, so unlike the old free-form `identify` used for
// leaderboard names, anything that touches player_economy requires proof of the PIN.
const pool = require('../db/pool');
const { resolveAccountStatus, accountBlockedPayload } = require('../db/accountStatus');
const { ensureAdminPrivileges } = require('../db/adminPrivileges');

// Reads "Authorization: Bearer <token>", looks up the player it belongs to,
// and attaches req.playerId. 401s if missing/invalid.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) return res.status(401).json({ error: 'missing auth token' });

  try {
    const { rows } = await pool.query(
      `SELECT id, status, status_reason, status_changed_at, suspended_until, session_expires_at, last_seen_at, is_guest, is_admin
       FROM players WHERE session_token = $1`,
      [token]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'invalid or expired session' });
    if (rows[0].session_expires_at && new Date(rows[0].session_expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: 'session expired, log in again' });
    }
    const statusInfo = await resolveAccountStatus(pool, rows[0].id, rows[0]);
    if (statusInfo.status !== 'active') {
      return res.status(403).json(accountBlockedPayload(statusInfo));
    }
    req.playerId = rows[0].id;
    req.isGuest = !!rows[0].is_guest;
    req.isAdmin = !!rows[0].is_admin;

    // Admin (cheat) accounts get topped back up to their unlimited floors
    // before the route below reads player_economy — see db/adminPrivileges.js.
    // Internally throttled, so this is cheap on every request but for the
    // first one after the throttle window.
    if (req.isAdmin) {
      try {
        await ensureAdminPrivileges(req.playerId);
      } catch (err) {
        console.error('ensureAdminPrivileges failed for', req.playerId, err);
      }
    }

    // Bump last_seen_at, but only if it's been >30s since the last write —
    // this endpoint is hit constantly during normal play, so throttling
    // keeps it from turning into a write-per-request on every API call.
    const lastSeen = rows[0].last_seen_at ? new Date(rows[0].last_seen_at).getTime() : 0;
    if (Date.now() - lastSeen > 30000) {
      pool.query(`UPDATE players SET last_seen_at = now() WHERE id = $1`, [rows[0].id]).catch(() => {});
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Extra middleware for the handful of endpoints guest/temporary accounts (see
// POST /api/auth/guest) aren't allowed to use — joining/creating a guild, and
// sending/receiving friend requests. Must run AFTER requireAuth (needs req.isGuest).
function blockGuests(req, res, next) {
  if (req.isGuest) {
    return res.status(403).json({ error: 'บัญชีชั่วคราวใช้งานส่วนนี้ไม่ได้ กรุณาตั้งชื่อผู้เล่นและ PIN ที่หน้าบัญชีก่อน' });
  }
  next();
}

module.exports = { requireAuth, blockGuests };
