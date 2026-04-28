# AA Backend — Account Aggregator Integration

Production-ready Node.js/TypeScript backend for fetching financial data via the Account Aggregator (AA) framework, designed for tax-loss harvesting.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Language | TypeScript (strict) |
| Framework | Fastify 4 |
| Database | PostgreSQL via Prisma |
| Cache / Queue | Redis + BullMQ |
| Logging | Pino (structured JSON) |
| Validation | Zod |
| Crypto | Node.js built-in `crypto` (AES-256-GCM + X25519 ECDH) |

---

## Folder Structure

```
aa-backend/
├── prisma/
│   └── schema.prisma          # DB models: User, Consent, Account, Holding, Transaction
├── src/
│   ├── config/
│   │   └── env.ts             # Zod-validated env vars — fails fast on missing config
│   ├── infra/
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── cache.ts           # Redis helpers + idempotency
│   │   ├── queue.ts           # BullMQ queue + worker
│   │   └── logger.ts          # Pino structured logger with redaction
│   ├── modules/
│   │   ├── aa/
│   │   │   ├── aa.controller.ts   # Fastify route handlers (thin)
│   │   │   ├── aa.service.ts      # Business logic: consent, fetch, decrypt, persist
│   │   │   ├── aa.client.ts       # HTTP client for AA provider (retry + backoff)
│   │   │   ├── aa.crypto.ts       # ECDH key exchange + AES-256-GCM decrypt
│   │   │   └── aa.mapper.ts       # AA raw data → internal normalized schema
│   │   └── portfolio/
│   │       ├── portfolio.controller.ts
│   │       └── portfolio.service.ts
│   ├── types/
│   │   ├── aa.types.ts        # AA provider API types (ReBIT spec)
│   │   ├── portfolio.types.ts # Internal normalized schema
│   │   └── common.types.ts    # AppError, ApiResponse
│   └── utils/
│       ├── errorHandler.ts    # Centralized Fastify error handler
│       └── requestId.ts       # Request ID generation
└── .env.example
```

---

## Setup

```bash
cd aa-backend
npm install

# Copy and fill in env vars
cp .env.example .env

# Generate Prisma client + run migrations
npm run prisma:generate
npm run prisma:migrate

# Dev server
npm run dev
```

---

## API Endpoints

### Consent Flow

```
POST   /aa/consent              Create consent request
GET    /aa/consent/:id          Check consent status
POST   /aa/consent/callback     AA webhook (HMAC verified)
```

### Data Fetch

```
POST   /aa/fetch                Trigger async data fetch
```

### Portfolio

```
GET    /portfolio               Get aggregated holdings + transactions
```

### Health

```
GET    /health                  Liveness check
```

---

## Consent Flow

```
Client                  AA Backend              AA Provider
  │                         │                        │
  │  POST /aa/consent        │                        │
  │─────────────────────────>│                        │
  │                         │  POST /Consent          │
  │                         │───────────────────────>│
  │                         │  { ConsentHandle }      │
  │                         │<───────────────────────│
  │  { redirectUrl }         │                        │
  │<─────────────────────────│                        │
  │                         │                        │
  │  [User approves on AA app]                        │
  │                         │  POST /aa/consent/callback
  │                         │<───────────────────────│
  │                         │  (HMAC verified)        │
  │                         │  status = ACTIVE        │
  │                         │  → enqueue fetch job    │
```

---

## Decryption Logic

The AA provider uses **ECDH (X25519) + AES-256-GCM**:

1. We generate an ephemeral X25519 key pair per data session
2. Send our public key in the `KeyMaterial` block of the session request
3. AA provider encrypts FI data with a shared secret derived from their private key + our public key
4. We derive the same shared secret using our private key + their public key (from the response `KeyMaterial`)
5. HKDF stretches the raw shared secret into a 32-byte AES key
6. AES-256-GCM decrypts: first 12 bytes = IV, last 16 bytes = auth tag

Keys are **never hardcoded** — loaded from `AA_PRIVATE_KEY_B64` / `AA_PUBLIC_KEY_B64` env vars (base64-encoded PEM).

---

## Data Mapping

`aa.mapper.ts` converts the decrypted FI JSON into the internal schema:

```typescript
{
  isin: string;       // e.g. "INE009A01021"
  symbol: string;     // e.g. "INFOSYS"
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number | null;
  source: "AA";
  accountId: string;
  fipId: string;
}
```

ISIN → symbol resolution uses a static map (replace with a live NSE/BSE feed in production).

---

## Security

- All AA tokens encrypted at rest (AES-256-CBC) before DB storage
- Webhook payloads verified via HMAC-SHA256 (constant-time comparison)
- Sensitive fields redacted from logs (`accessTokenEnc`, `privateKey`, auth headers)
- Rate limiting via Redis (per-IP)
- Helmet for HTTP security headers
- Zod validates all incoming request bodies

---

## Sample Requests

### Create Consent
```bash
curl -X POST http://localhost:4000/aa/consent \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: unique-key-123" \
  -d '{
    "userId": "clxyz123",
    "mobile": "9999999999@setu",
    "fetchFrom": "2024-04-01T00:00:00Z",
    "fetchTo": "2025-04-01T00:00:00Z"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "consentId": "clxyz456",
    "consentHandle": "aa-handle-uuid",
    "redirectUrl": "https://api.setu.co/v2/consent/aa-handle-uuid"
  },
  "requestId": "req-uuid"
}
```

### Trigger Data Fetch
```bash
curl -X POST http://localhost:4000/aa/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt>" \
  -d '{ "consentId": "clxyz456" }'
```

**Response:**
```json
{
  "success": true,
  "data": { "sessionId": "session-uuid" },
  "requestId": "req-uuid"
}
```

### Get Portfolio
```bash
curl http://localhost:4000/portfolio \
  -H "Authorization: Bearer <jwt>"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "clxyz123",
    "holdings": [
      {
        "isin": "INE009A01021",
        "symbol": "INFOSYS",
        "quantity": 10,
        "avgPrice": 1450.00,
        "currentPrice": 1620.50,
        "source": "AA"
      }
    ],
    "totalInvested": 14500.00,
    "currentValue": 16205.00,
    "unrealizedPnL": 1705.00
  }
}
```
