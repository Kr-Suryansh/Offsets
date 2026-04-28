// ─── AA Provider API Types ────────────────────────────────────────────────────
// Based on ReBIT AA spec (used by Setu / Finvu / Anumati)

export interface AAConsentRequest {
  consentStart: string;       // ISO 8601
  consentExpiry: string;
  consentMode: "VIEW" | "STORE" | "QUERY" | "STREAM";
  fetchType: "ONETIME" | "PERIODIC";
  consentTypes: ConsentType[];
  fiTypes: FIType[];
  DataConsumer: { id: string };
  Customer: { id: string };   // mobile@AA_HANDLE
  FIDataRange: { from: string; to: string };
  DataLife: { unit: "MONTH" | "YEAR" | "DAY" | "INF"; value: number };
  Frequency: { unit: "HOUR" | "DAY" | "MONTH" | "YEAR" | "INF"; value: number };
  DataFilter?: DataFilter[];
}

export type ConsentType = "PROFILE" | "SUMMARY" | "TRANSACTIONS";
export type FIType = "EQUITIES" | "MUTUAL_FUNDS" | "DEPOSIT" | "INSURANCE";

export interface DataFilter {
  type: "TRANSACTIONTYPE" | "TRANSACTIONAMOUNT";
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=";
  value: string;
}

export interface AAConsentResponse {
  ver: string;
  timestamp: string;
  txnid: string;
  ConsentHandle: string;
}

export interface AAConsentStatusResponse {
  ver: string;
  timestamp: string;
  txnid: string;
  ConsentHandle: string;
  ConsentStatus: {
    id: string;
    status: "PENDING" | "ACTIVE" | "PAUSED" | "REVOKED" | "EXPIRED";
  };
}

export interface AAConsentCallbackPayload {
  ver: string;
  timestamp: string;
  txnid: string;
  Notifier: { type: string; id: string };
  ConsentStatusNotification: {
    consentId: string;
    consentHandle: string;
    consentStatus: "ACTIVE" | "PAUSED" | "REVOKED" | "EXPIRED";
  };
}

// ─── Data Session / Fetch ─────────────────────────────────────────────────────

export interface AADataSessionRequest {
  consentId: string;
  DataRange: { from: string; to: string };
  KeyMaterial: AAKeyMaterial;
}

export interface AADataSessionResponse {
  ver: string;
  timestamp: string;
  txnid: string;
  sessionId: string;
}

export interface AAFetchDataResponse {
  ver: string;
  timestamp: string;
  txnid: string;
  FI: AAFIData[];
}

export interface AAFIData {
  fipID: string;
  data: AAEncryptedData[];
  KeyMaterial: AAKeyMaterial;
}

export interface AAEncryptedData {
  linkRefNumber: string;
  maskedAccNumber: string;
  encryptedFI: string;   // Base64 AES-GCM ciphertext
}

export interface AAKeyMaterial {
  cryptoAlg: "ECDH";
  curve: "Curve25519";
  params: string;
  DHPublicKey: {
    expiry: string;
    Parameters: string | null;
    KeyValue: string;   // Base64 public key
  };
  Nonce: string;        // Base64 nonce
}

// ─── Decrypted FI Data ────────────────────────────────────────────────────────

export interface DecryptedFIDocument {
  account: {
    linkedAccRef: string;
    maskedAccNumber: string;
    type: FIType;
    Profile?: EquityProfile | MFProfile;
    Summary?: EquitySummary | MFSummary;
    Transactions?: { Transaction: RawTransaction[] };
  };
}

export interface EquityProfile {
  Holders: { Holder: { name: string; dob: string; pan: string }[] };
}

export interface MFProfile {
  Holders: { Holder: { name: string; dob: string; pan: string }[] };
}

export interface EquitySummary {
  currentValue: number;
  Investment: { Holdings: { Holding: RawHolding[] } };
}

export interface MFSummary {
  currentValue: number;
  Investment: { Holdings: { Holding: RawHolding[] } };
}

export interface RawHolding {
  isin: string;
  isinDescription: string;
  units: number;
  lastTradedPrice: number;
  closingPrice?: number;
  NAV?: number;
  purchasePrice?: number;
}

export interface RawTransaction {
  txnId: string;
  type: "BUY" | "SELL" | "DIVIDEND" | "BONUS" | "SPLIT";
  isin: string;
  description: string;
  units: number;
  price: number;
  amount: number;
  tradeDate: string;   // ISO 8601
}
