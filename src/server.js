// Sunrise Microfinance — Borrower Management Sandbox
// A deliberately simple Express app standing in as the "staging"
// borrower-management platform for security testing practice.
// This app and its data are entirely synthetic — see docs/Scope_Authorization.pdf.

const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 8000;

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'sunrise',
  password: process.env.DB_PASSWORD || 'sunrisepass',
  database: process.env.DB_NAME || 'sunrise_sandbox',
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'sandbox-session-secret-not-for-production',
  resave: false,
  saveUninitialized: false,
}));

// --- Simple demo credential (sandbox only, documented in README) ---
const DEMO_USER = { username: 'admin', password: 'admin123' };

function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.redirect('/login');
}

// --- Login page ---
app.get('/login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Sunrise Microfinance — Staff Login</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f4f6f8; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
        .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); width: 320px; }
        h1 { font-size: 20px; color: #1a3c5e; margin-bottom: 4px; }
        p.sub { color: #777; font-size: 13px; margin-top: 0; margin-bottom: 24px; }
        label { font-size: 13px; color: #333; display: block; margin-bottom: 4px; }
        input { width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
        button { width: 100%; padding: 10px; background: #1a3c5e; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .error { color: #c0392b; font-size: 13px; margin-bottom: 12px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>Sunrise Microfinance</h1>
        <p class="sub">Borrower Management — Staging Sandbox</p>
        ${req.query.error ? '<p class="error">Invalid username or password.</p>' : ''}
        <form method="POST" action="/login">
          <label>Username</label>
          <input type="text" name="username" required />
          <label>Password</label>
          <input type="password" name="password" required />
          <button type="submit">Log In</button>
        </form>
      </div>
    </body>
    </html>
  `);
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === DEMO_USER.username && password === DEMO_USER.password) {
    req.session.loggedIn = true;
    req.session.username = username;
    return res.redirect('/borrowers');
  }
  return res.redirect('/login?error=1');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// --- Borrower list page ---
app.get('/borrowers', requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, national_id, bank_account, loan_balance FROM borrowers ORDER BY id LIMIT 100'
    );
    const rows = result.rows.map(b => `
      <tr>
        <td>${b.id}</td>
        <td>${b.full_name}</td>
        <td>${b.national_id}</td>
        <td>${b.bank_account}</td>
        <td>$${Number(b.loan_balance).toFixed(2)}</td>
      </tr>
    `).join('');

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Borrowers — Sunrise Microfinance</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; background: #f4f6f8; }
          header { background: #1a3c5e; color: white; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
          header a { color: white; text-decoration: none; font-size: 14px; }
          main { padding: 24px; }
          table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
          th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; font-size: 14px; }
          th { background: #eef2f5; color: #1a3c5e; }
          .note { color: #777; font-size: 12px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <header>
          <strong>Sunrise Microfinance — Borrower List</strong>
          <a href="/logout">Log out (${req.session.username})</a>
        </header>
        <main>
          <p class="note">Showing first 100 of synthetic borrower records (sandbox data only).</p>
          <table>
            <tr><th>ID</th><th>Full Name</th><th>National ID (mock)</th><th>Bank Account (mock)</th><th>Loan Balance</th></tr>
            ${rows}
          </table>
        </main>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error loading borrowers: ' + err.message);
  }
});

app.get('/', (req, res) => res.redirect('/borrowers'));

app.listen(PORT, () => {
  console.log(`Sunrise Microfinance sandbox running on port ${PORT}`);
});
