# API Documentation - Tax Optimizer Backend

Base URL for all endpoints typically: `http://localhost:5000`

## Overview
The application handles the analysis and strategy generation for stock portfolios specifically catering to Tax Harvesting.

## 1. Analyze Portfolio
- **Endpoint**: `/api/tax/analyze`
- **Method**: `POST`
- **Description**: Analyzes raw portfolio arrays and returns sanitised data including holding periods, tax classification (STCG/LTCG), and unrealised PnL. Includes a general AI strategy summary.
- **Request JSON Body**:
  ```json
  {
    "assets": [
      {
        "stockName": "TCS",
        "buyPrice": 3500,
        "currentPrice": 3600,
        "buyDate": "2023-01-15T00:00:00Z",
        "quantity": 10
      },
      {
        "stockName": "HDFC",
        "buyPrice": 1600,
        "currentPrice": 1400,
        "buyDate": "2023-11-20T00:00:00Z",
        "quantity": 50
      }
    ]
  }
  ```

## 2. Tax-Loss Harvesting
- **Endpoint**: `/api/tax/harvest-loss`
- **Method**: `POST`
- **Description**: Filters the portfolio for only loss-making assets. Generates AI strategy specifically designed to lower tax liability.
- **Request JSON Body**: (Same format as Analyze)
- **Response Shape**:
  ```json
  {
    "success": true,
    "eligibleAssets": [...],
    "aiStrategy": {
      "parsedJson": [...],
      "textExplanation": "..."
    }
  }
  ```

## 3. Tax-Gain Harvesting
- **Endpoint**: `/api/tax/harvest-gain`
- **Method**: `POST`
- **Description**: Filters the portfolio for profitable **LTCG** assets. Generates AI strategy to utilise tax-free limits (Cost basis reset).
- **Request JSON Body**: (Same format as Analyze)
- **Response Shape**:
  ```json
  {
    "success": true,
    "eligibleAssets": [...],
    "aiStrategy": {
      "parsedJson": [...],
      "textExplanation": "..."
    }
  }
  ```

## 4. Gifting Analysis
- **Endpoint**: `/api/tax/gifting-analysis`
- **Method**: `POST`
- **Description**: Evaluates family gifting efficiency to take advantage of lower tax brackets.
- **Request JSON Body**:
  ```json
  {
    "assets": [...],
    "family": {
      "spouseBracket": "10%",
      "childBracket": "0%"
    }
  }
  ```

## 5. Strategy Optimize (Engine)
- **Endpoint**: `/api/tax/strategy-optimize`
- **Method**: `POST`
- **Description**: Full strategy engine combining holding period, gains, losses, and gifting to output a cohesive plan.
- **Request JSON Body**: Same as others, plus optional user preferences.
- **Response Shape**: Full optimization plan and estimated total tax saved.

## 6. AI Explain
- **Endpoint**: `/api/ai/explain`
- **Method**: `POST`
- **Description**: Fetches an isolated plain-text explanation for a specific action.
- **Request JSON Body**:
  ```json
  {
    "action": "SELL",
    "asset": "TCS",
    "context": "Has a loss of 30,000 INR."
  }
  ```
