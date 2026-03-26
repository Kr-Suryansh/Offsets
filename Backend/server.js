const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const taxRoutes = require('./routes/tax.routes');
const authRoutes = require('./routes/auth.routes');
require('dotenv').config();

const app = express();

// Connect Database
connectDB();

// Init Middleware
app.use(cors());
app.use(express.json({ extended: false }));

// Define Routes
app.use('/api/tax', taxRoutes);
app.use('/api/auth', authRoutes);

// Health check and API Overview route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Tax Optimizer Backend API</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #333; background: #f9fafb; }
          h1 { color: #2563eb; }
          .endpoint { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .badge { background: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: bold; font-size: 0.875rem; font-family: monospace; }
          .method { background: #dcfce7; color: #166534; margin-right: 0.5rem; }
        </style>
      </head>
      <body>
        <h1>🚀 Tax Optimizer Backend is Running!</h1>
        <p>This is the API backend for your application. Below are the available API endpoints. Note that all of these must be accessed via POST requests.</p>
        
        <h2>Available API Endpoints:</h2>
        
        <div class="endpoint">
          <h3><span class="badge method">POST</span> <span class="badge">/api/tax/analyze</span></h3>
          <p><strong>Description:</strong> Analyzes your portfolio for tax optimization.</p>
        </div>

        <div class="endpoint">
          <h3><span class="badge method">POST</span> <span class="badge">/api/tax/harvest-loss</span></h3>
          <p><strong>Description:</strong> Generates a Tax-Loss Harvesting Strategy.</p>
        </div>

        <div class="endpoint">
          <h3><span class="badge method">POST</span> <span class="badge">/api/tax/harvest-gain</span></h3>
          <p><strong>Description:</strong> Generates a Tax-Gain Harvesting Strategy.</p>
        </div>
        
        <p><em>Note: If you want to test these endpoints, you will need to use a tool like Postman, Thunder Client, or send a POST request from your frontend application.</em></p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
