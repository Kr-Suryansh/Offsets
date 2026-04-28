/**
 * aa.client.ts
 *
 * Low-level HTTP client for the AA provider API.
 * Provider-specific logic is isolated here — swap Setu for Finvu
 * by changing only this file and env vars.
 *
 * Implements:
 *  - Retry with exponential backoff
 *  - Request ID injection
 *  - Auth header management
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import crypto from "crypto";
import { env } from "@config/env";
import { logger } from "@infra/logger";
import { AppError } from "@types/common.types";
import type {
  AAConsentRequest,
  AAConsentResponse,
  AAConsentStatusResponse,
  AADataSessionRequest,
  AADataSessionResponse,
  AAFetchDataResponse,
} from "@types/aa.types";

// ─── Retry config ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(err: AxiosError): boolean {
  if (!err.response) return true; // network error
  const status = err.response.status;
  return status === 429 || status >= 500;
}

// ─── Client factory ───────────────────────────────────────────────────────────

function createAAAxiosInstance(): AxiosInstance {
  const instance = axios.create({
    baseURL: env.AA_BASE_URL,
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
      "x-client-id": env.AA_CLIENT_ID,
    },
  });

  // Attach auth + request ID on every request
  instance.interceptors.request.use((config) => {
    config.headers["x-request-id"] = crypto.randomUUID();
    config.headers["Authorization"] = `Bearer ${env.AA_CLIENT_SECRET}`;
    return config;
  });

  return instance;
}

const aaHttp = createAAAxiosInstance();

// ─── Generic request with retry ───────────────────────────────────────────────

async function request<T>(
  method: "get" | "post",
  path: string,
  data?: unknown,
  requestId?: string
): Promise<T> {
  const reqId = requestId ?? crypto.randomUUID();
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      const res =
        method === "post"
          ? await aaHttp.post<T>(path, data, { headers: { "x-request-id": reqId } })
          : await aaHttp.get<T>(path, { headers: { "x-request-id": reqId } });

      return res.data;
    } catch (err) {
      const axiosErr = err as AxiosError;
      const shouldRetry = isRetryable(axiosErr) && attempt < MAX_RETRIES;

      logger.warn(
        {
          requestId: reqId,
          attempt: attempt + 1,
          status: axiosErr.response?.status,
          path,
          willRetry: shouldRetry,
        },
        "AA API request failed"
      );

      if (!shouldRetry) {
        const status = axiosErr.response?.status ?? 502;
        const message =
          (axiosErr.response?.data as { message?: string })?.message ??
          "AA provider error";
        throw new AppError(message, status, "AA_CLIENT_ERROR");
      }

      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      await sleep(delay);
      attempt++;
    }
  }

  throw new AppError("AA provider unreachable after retries", 502, "AA_UNREACHABLE");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const aaClient = {
  /**
   * POST /Consent — initiate consent request
   */
  createConsent(
    payload: AAConsentRequest,
    requestId?: string
  ): Promise<AAConsentResponse> {
    logger.info({ requestId }, "AA: creating consent");
    return request<AAConsentResponse>("post", "/Consent", payload, requestId);
  },

  /**
   * GET /Consent/handle/:handle — poll consent status
   */
  getConsentStatus(
    consentHandle: string,
    requestId?: string
  ): Promise<AAConsentStatusResponse> {
    logger.info({ consentHandle, requestId }, "AA: fetching consent status");
    return request<AAConsentStatusResponse>(
      "get",
      `/Consent/handle/${consentHandle}`,
      undefined,
      requestId
    );
  },

  /**
   * POST /FI/request — create a data session
   */
  createDataSession(
    payload: AADataSessionRequest,
    requestId?: string
  ): Promise<AADataSessionResponse> {
    logger.info({ consentId: payload.consentId, requestId }, "AA: creating data session");
    return request<AADataSessionResponse>("post", "/FI/request", payload, requestId);
  },

  /**
   * GET /FI/fetch/:sessionId — fetch encrypted FI data
   */
  fetchData(
    sessionId: string,
    requestId?: string
  ): Promise<AAFetchDataResponse> {
    logger.info({ sessionId, requestId }, "AA: fetching FI data");
    return request<AAFetchDataResponse>(
      "get",
      `/FI/fetch/${sessionId}`,
      undefined,
      requestId
    );
  },
};
