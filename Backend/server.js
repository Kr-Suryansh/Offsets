const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const taxRoutes = require('./routes/tax.routes');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// Routes
app.use('/api/tax', taxRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// API Dashboard
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaxSmart AI — API Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 860px; margin: 0 auto; padding: 3rem 1.5rem; }
    .header { text-align: center; margin-bottom: 3rem; }
    .logo { display: inline-flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .logo-icon { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .logo h1 { font-size: 1.75rem; font-weight: 700; background: linear-gradient(135deg, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .subtitle { color: #94a3b8; font-size: 0.95rem; }
    .status { display: inline-flex; align-items: center; gap: 0.5rem; background: #1e293b; border: 1px solid #334155; padding: 0.5rem 1rem; border-radius: 999px; font-size: 0.8rem; color: #4ade80; margin-top: 1rem; }
    .status .dot { width: 8px; height: 8px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .section { margin-bottom: 2rem; }
    .section-title { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 0.75rem; padding-left: 0.25rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
    .endpoint { display: flex; align-items: center; gap: 1rem; padding: 1rem 1.25rem; border-bottom: 1px solid #334155; cursor: pointer; transition: background 0.15s; text-decoration: none; color: inherit; }
    .endpoint:last-child { border-bottom: none; }
    .endpoint:hover { background: #334155; }
    .method { font-size: 0.7rem; font-weight: 700; padding: 0.25rem 0.6rem; border-radius: 6px; font-family: 'Inter', monospace; min-width: 52px; text-align: center; }
    .method-post { background: #3b82f6; color: #fff; }
    .method-get { background: #22c55e; color: #fff; }
    .path { font-family: monospace; font-size: 0.9rem; font-weight: 500; color: #f1f5f9; }
    .desc { font-size: 0.8rem; color: #94a3b8; margin-left: auto; white-space: nowrap; }
    .arrow { color: #475569; font-size: 1.2rem; margin-left: 0.5rem; transition: transform 0.15s; }
    .endpoint:hover .arrow { transform: translateX(3px); color: #94a3b8; }
    .footer { text-align: center; color: #475569; font-size: 0.75rem; margin-top: 3rem; }
    .footer a { color: #64748b; text-decoration: none; }
    .footer a:hover { color: #94a3b8; }
    @media (max-width: 640px) { .desc { display: none; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">&#x1F4C8;</div>
        <h1>TaxSmart AI</h1>
      </div>
      <p class="subtitle">Backend API Server &bull; v1.0.0</p>
      <div class="status"><span class="dot"></span> Server is running on port ${process.env.PORT || 5000}</div>
    </div>

    <div class="section">
      <div class="section-title">&#x1F512; Authentication</div>
      <div class="card">
        <a class="endpoint" href="/api/auth/me" target="_blank">
          <span class="method method-get">GET</span>
          <span class="path">/api/auth/me</span>
          <span class="desc">Current user session</span>
          <span class="arrow">&rarr;</span>
        </a>
        <div class="endpoint" onclick="copyEndpoint('/api/auth/register')">
          <span class="method method-post">POST</span>
          <span class="path">/api/auth/register</span>
          <span class="desc">Register a new user</span>
          <span class="arrow">&rarr;</span>
        </div>
        <div class="endpoint" onclick="copyEndpoint('/api/auth/login')">
          <span class="method method-post">POST</span>
          <span class="path">/api/auth/login</span>
          <span class="desc">Login</span>
          <span class="arrow">&rarr;</span>
        </div>
        <div class="endpoint" onclick="copyEndpoint('/api/auth/change-password')">
          <span class="method method-post">POST</span>
          <span class="path">/api/auth/change-password</span>
          <span class="desc">Change password</span>
          <span class="arrow">&rarr;</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">&#x1F4CA; Tax Analysis</div>
      <div class="card">
        <div class="endpoint" onclick="copyEndpoint('/api/tax/analyze')">
          <span class="method method-post">POST</span>
          <span class="path">/api/tax/analyze</span>
          <span class="desc">Analyze portfolio</span>
          <span class="arrow">&rarr;</span>
        </div>
        <div class="endpoint" onclick="copyEndpoint('/api/tax/harvest-loss')">
          <span class="method method-post">POST</span>
          <span class="path">/api/tax/harvest-loss</span>
          <span class="desc">Loss harvesting strategy</span>
          <span class="arrow">&rarr;</span>
        </div>
        <div class="endpoint" onclick="copyEndpoint('/api/tax/harvest-gain')">
          <span class="method method-post">POST</span>
          <span class="path">/api/tax/harvest-gain</span>
          <span class="desc">Gain harvesting strategy</span>
          <span class="arrow">&rarr;</span>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">&#x1F916; AI Engine</div>
      <div class="card">
        <div class="endpoint" onclick="copyEndpoint('/api/ai/explain')">
          <span class="method method-post">POST</span>
          <span class="path">/api/ai/explain</span>
          <span class="desc">Explain a recommended action</span>
          <span class="arrow">&rarr;</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>POST endpoints require a JSON body &mdash; use <a href="https://www.postman.com" target="_blank">Postman</a> or your frontend app to test them.</p>
      <p style="margin-top:0.5rem">Built with Express.js &bull; MongoDB &bull; Groq AI</p>
    </div>
  </div>

  <script>
    function copyEndpoint(path) {
      const url = window.location.origin + path;
      navigator.clipboard.writeText(url).then(() => {
        const toast = document.createElement('div');
        toast.textContent = 'Copied: ' + url;
        toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#3b82f6;color:#fff;padding:0.6rem 1.2rem;border-radius:8px;font-size:0.85rem;z-index:99;animation:fadeout 2s forwards;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      });
    }
  </script>
  <style>@keyframes fadeout { 0%{opacity:1} 70%{opacity:1} 100%{opacity:0} }</style>
</body>
</html>`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
