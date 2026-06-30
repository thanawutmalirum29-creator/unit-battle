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

// basic spam/bot guard — tune per classroom size
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

app.use('/api/players', playersRoute);
app.use('/api/runs', runsRoute);
app.use('/api/leaderboard', leaderboardRoute);
app.use('/api/progress', progressRoute);

// serve the cleaned-up game client
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`UnitBattle server running on port ${PORT}`));
