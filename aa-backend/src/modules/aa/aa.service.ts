/**
 * aa.service.ts
 *
 * Orchestrates the full AA flow:
 *   Consent creation → Callback handling → Data fetch → Decrypt → Normalize → Persist
 */

import crypto from "crypto";
import { prisma } from "@infra/db";
import { logger } from "@infra/logger";
import { cacheSet, cacheGet, acquireIdempotencyLock, setIdempotencyResult, getIdempotencyResult } from "@infra/cache";
import { aaClient } from "./aa.client";
import { decryptFIData, encryptToken, verifyWebhookSignature } from "./aa.crypto";
import { mapFIDocument } from "./aa.mapper";
import { dataFetchQueue } from "@infra/queue";
import { AppError } from "@types/common.types";
import { env } from "@config/env";
import type {
  AAConsentCallbackPayload,
  AAFIData,
  DecryptedFIDocument,
} from "@types/aa.types";
import type { NormalizedHolding, NormalizedTransaction } from "@types/portfolio.types";

// ─── Consent ──────────────────────────────────────────────────────────────────

export interface CreateConsentInput {
  userId: string;
  mobile: string;         // e.g. "9999999999@setu"
  fetchFrom: Date;
  fetchTo: Date;
  idempotencyKey?: string;
}

export interface CreateConsentResult {
  consentId: string;
  consentHandle: string;
  redirectUrl: string;
}

export async function createConsent(
  input: CreateConsentInput
): Promise<CreateConsentResult> {
  const reqId = crypto.randomUUID();

  // Idempotency check
  if (input.idempotencyKey) {
    const cached = await getIdempotencyResult<CreateConsentResult>(input.idempotencyKey);
    if (cached) {
      logger.info({ idempotencyKey: input.idempotencyKey }, "Returning cached consent result");
      return cached;
    }
  }

  const now = new Date();
  const expiry = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days

  const aaResponse = await aaClient.createConsent(
    {
      consentStart: now.toISOString(),
      consentExpiry: expiry.toISOString(),
      consentMode: "STORE",
      fetchType: "PERIODIC",
      consentTypes: ["SUMMARY", "TRANSACTIONS"],
      fiTypes: ["EQUITIES", "MUTUAL_FUNDS"],
      DataConsumer: { id: env.AA_CLIENT_ID },
      Customer: { id: input.mobile },
      FIDataRange: {
        from: input.fetchFrom.toISOString(),
        to: input.fetchTo.toISOString(),
      },
      DataLife: { unit: "YEAR", value: 1 },
      Frequency: { unit: "MONTH", value: 1 },
    },
    reqId
  );

  const consent = await prisma.consent.create({
    data: {
      userId: input.userId,
      aaConsentId: aaResponse.ConsentHandle, // handle before approval
      consentHandle: aaResponse.ConsentHandle,
      status: "PENDING",
      fetchFrom: input.fetchFrom,
      fetchTo: input.fetchTo,
    },
  });

  logger.info(
    { requestId: reqId, consentId: consent.id, userId: input.userId },
    "Consent created"
  );

  const result: CreateConsentResult = {
    consentId: consent.id,
    consentHandle: aaResponse.ConsentHandle,
    redirectUrl: `${env.AA_BASE_URL}/consent/${aaResponse.ConsentHandle}`,
  };

  if (input.idempotencyKey) {
    await setIdempotencyResult(input.idempotencyKey, result);
  }

  return result;
}

// ─── Consent Status ───────────────────────────────────────────────────────────

export async function getConsentStatus(consentId: string): Promise<{
  status: string;
  aaConsentId: string;
}> {
  const consent = await prisma.consent.findUnique({ where: { id: consentId } });
  if (!consent) throw new AppError("Consent not found", 404, "CONSENT_NOT_FOUND");

  // Poll AA for latest status
  const aaStatus = await aaClient.getConsentStatus(consent.consentHandle ?? consent.aaConsentId);
  const newStatus = aaStatus.ConsentStatus.status;

  if (newStatus !== consent.status) {
    await prisma.consent.update({
      where: { id: consentId },
      data: { status: newStatus },
    });
  }

  return { status: newStatus, aaConsentId: aaStatus.ConsentStatus.id };
}

// ─── Consent Callback (Webhook) ───────────────────────────────────────────────

export async function handleConsentCallback(
  rawBody: string,
  signature: string
): Promise<void> {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new AppError("Invalid webhook signature", 401, "INVALID_SIGNATURE");
  }

  const payload: AAConsentCallbackPayload = JSON.parse(rawBody);
  const { consentId, consentHandle, consentStatus } =
    payload.ConsentStatusNotification;

  logger.info({ consentId, consentStatus }, "Consent callback received");

  const consent = await prisma.consent.findFirst({
    where: { consentHandle },
  });

  if (!consent) {
    logger.warn({ consentHandle }, "Consent not found for callback");
    return;
  }

  await prisma.consent.update({
    where: { id: consent.id },
    data: {
      aaConsentId: consentId,
      status: consentStatus,
    },
  });

  // If consent became active, enqueue a data fetch
  if (consentStatus === "ACTIVE") {
    await dataFetchQueue.add(
      "fetch-fi-data",
      { consentId: consent.id, userId: consent.userId },
      { attempts: 3, backoff: { type: "exponential", delay: 2000 } }
    );
    logger.info({ consentId: consent.id }, "Data fetch job enqueued");
  }
}

// ─── Data Fetch ───────────────────────────────────────────────────────────────

export interface TriggerFetchInput {
  consentId: string;
  userId: string;
  fetchFrom?: Date;
  fetchTo?: Date;
}

export async function triggerDataFetch(input: TriggerFetchInput): Promise<{ sessionId: string }> {
  const consent = await prisma.consent.findUnique({ where: { id: input.consentId } });

  if (!consent) throw new AppError("Consent not found", 404, "CONSENT_NOT_FOUND");
  if (consent.status !== "ACTIVE") {
    throw new AppError(`Consent is ${consent.status}`, 400, "CONSENT_NOT_ACTIVE");
  }
  if (consent.userId !== input.userId) {
    throw new AppError("Forbidden", 403, "FORBIDDEN");
  }

  const fetchFrom = input.fetchFrom ?? consent.fetchFrom ?? new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const fetchTo = input.fetchTo ?? consent.fetchTo ?? new Date();

  // Generate our ephemeral key material for this session
  const { privateKey, publicKey } = crypto.generateKeyPairSync("x25519");
  const pubKeyB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const nonce = crypto.randomBytes(32).toString("base64");

  const sessionRes = await aaClient.createDataSession({
    consentId: consent.aaConsentId,
    DataRange: { from: fetchFrom.toISOString(), to: fetchTo.toISOString() },
    KeyMaterial: {
      cryptoAlg: "ECDH",
      curve: "Curve25519",
      params: "curve25519/ECDH",
      DHPublicKey: {
        expiry: new Date(Date.now() + 3600_000).toISOString(),
        Parameters: null,
        KeyValue: pubKeyB64,
      },
      Nonce: nonce,
    },
  });

  await prisma.dataFetch.create({
    data: {
      consentId: consent.id,
      sessionId: sessionRes.sessionId,
      status: "PENDING",
      fetchFrom,
      fetchTo,
    },
  });

  // Enqueue async processing
  await dataFetchQueue.add(
    "process-fi-session",
    {
      sessionId: sessionRes.sessionId,
      userId: input.userId,
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    },
    { attempts: 3, backoff: { type: "exponential", delay: 3000 } }
  );

  return { sessionId: sessionRes.sessionId };
}

// ─── Process fetched FI data (called by queue worker) ────────────────────────

export async function processFISession(
  sessionId: string,
  userId: string
): Promise<void> {
  const dataFetch = await prisma.dataFetch.findUnique({ where: { sessionId } });
  if (!dataFetch) throw new AppError("DataFetch not found", 404);

  await prisma.dataFetch.update({
    where: { sessionId },
    data: { status: "PROCESSING" },
  });

  try {
    const fiResponse = await aaClient.fetchData(sessionId);
    const allHoldings: NormalizedHolding[] = [];
    const allTransactions: NormalizedTransaction[] = [];

    for (const fiData of fiResponse.FI) {
      const mapped = await decryptAndMapFIData(fiData);
      allHoldings.push(...mapped.holdings);
      allTransactions.push(...mapped.transactions);
    }

    await persistPortfolioData(userId, allHoldings, allTransactions);

    await prisma.dataFetch.update({
      where: { sessionId },
      data: { status: "READY", completedAt: new Date() },
    });

    // Invalidate portfolio cache
    await cacheSet(`portfolio:${userId}`, null, 1);

    logger.info(
      { sessionId, userId, holdings: allHoldings.length, transactions: allTransactions.length },
      "FI data processed successfully"
    );
  } catch (err) {
    await prisma.dataFetch.update({
      where: { sessionId },
      data: { status: "FAILED" },
    });
    throw err;
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function decryptAndMapFIData(fiData: AAFIData) {
  const holdings: NormalizedHolding[] = [];
  const transactions: NormalizedTransaction[] = [];

  for (const encData of fiData.data) {
    try {
      const decryptedJson = decryptFIData(encData.encryptedFI, fiData.KeyMaterial);
      const doc: DecryptedFIDocument = JSON.parse(decryptedJson);
      const mapped = mapFIDocument(doc, fiData.fipID);
      holdings.push(...mapped.holdings);
      transactions.push(...mapped.transactions);
    } catch (err) {
      logger.error(
        { fipId: fiData.fipID, linkRef: encData.linkRefNumber, err },
        "Failed to decrypt/map FI data for account — skipping"
      );
      // Partial data: continue with other accounts
    }
  }

  return { holdings, transactions };
}

async function persistPortfolioData(
  userId: string,
  holdings: NormalizedHolding[],
  transactions: NormalizedTransaction[]
): Promise<void> {
  // Upsert holdings
  for (const h of holdings) {
    await prisma.holding.upsert({
      where: {
        userId_accountId_isin: {
          userId,
          accountId: h.accountId,
          isin: h.isin,
        },
      },
      update: {
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        symbol: h.symbol,
        name: h.name,
        asOf: new Date(),
      },
      create: {
        userId,
        accountId: h.accountId,
        isin: h.isin,
        symbol: h.symbol,
        name: h.name,
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        source: "AA",
        asOf: new Date(),
      },
    });
  }

  // Insert transactions (skip duplicates by catching unique constraint)
  for (const tx of transactions) {
    try {
      await prisma.transaction.create({
        data: {
          userId,
          isin: tx.isin,
          symbol: tx.symbol,
          txType: tx.txType,
          quantity: tx.quantity,
          price: tx.price,
          amount: tx.amount,
          txDate: tx.txDate,
          source: "AA",
        },
      });
    } catch {
      // Duplicate — skip silently
    }
  }
}
