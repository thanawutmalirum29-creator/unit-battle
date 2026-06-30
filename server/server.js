// server.js — entrypoint, deploy target: Railway
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const playersRoute = require('./routes/players');
const runsRoute = require('./routes/runs');
const leaderboardRoute = require('./routes/leaderboard');
const progressRoute = require('./routes/progress');

const app = express();
app.set('trust proxy', 1); // Railway sits behind a reverse proxy — required for express-rate-limit
app.use(cors());
app.use(express.json());

// basic spam/bot guard — tune per classroom size (only applies to API calls, not page/asset loads)
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 60 });

app.use('/api/players', apiLimiter, playersRoute);
app.use('/api/runs', apiLimiter, runsRoute);
app.use('/api/leaderboard', apiLimiter, leaderboardRoute);
app.use('/api/progress', apiLimiter, progressRoute);

// serve the cleaned-up game client
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

// open the game directly at the root URL
app.get('/', (req, res) => res.redirect('/pages/game.html'));

// 404 for unmatched API routes (keeps responses JSON instead of falling through to the static 404 page)
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// Centralized error handler — every async route in this app can throw (DB errors, etc).
// Express 4 does NOT catch rejected promises from async handlers on its own, so without
// this, a thrown error inside a route either hangs the request forever or, on some Node
// versions, crashes the whole process via an unhandled rejection. Routes call next(err)
// (see asyncHandler in each router) which lands here.
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'malformed JSON body' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'internal server error' });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`UnitBattle server running on port ${PORT}`));
