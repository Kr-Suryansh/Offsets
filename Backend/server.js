require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const connectDB  = require('./config/db');
const authRoutes      = require('./routes/auth.routes');
const portfolioRoutes = require('./routes/portfolio.routes');
const taxRoutes       = require('./routes/tax.routes');
const aiRoutes        = require('./routes/ai.routes');
const growwRoutes     = require('./routes/groww.routes');

const app = express();

connectDB();

// Log every incoming request
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.use(cors());
app.use(express.json());

app.use('/api/auth',      authRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/tax',       taxRoutes);
app.use('/api/ai',        aiRoutes);
app.use('/api/groww',     growwRoutes);

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'tax-optimizer-backend', ts: new Date().toISOString() })
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
