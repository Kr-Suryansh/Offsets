/**
 * angelone.service.js
 * Handles AngelOne SmartAPI authentication and portfolio fetching.
 */
const axios = require('axios');
const crypto = require('crypto');
const os = require('os');

const ANGELONE_BASE_URL = 'https://apiconnect.angelone.in';

/**
 * Decode a base32-encoded string to a Buffer.
 */
function base32Decode(encoded) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of encoded.toUpperCase().replace(/=+$/, '')) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate a TOTP code from a base32 secret (RFC 6238).
 */
function generateTOTP(secret, period = 30, digits = 6) {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / period);

  // Convert counter to 8-byte big-endian buffer
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xFFFFFFFF, 4);

  const hmac = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  ) % Math.pow(10, digits);

  return code.toString().padStart(digits, '0');
}

/**
 * Get the system's local IP address
 */
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

/**
 * Get the system's MAC address
 */
function getMACAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.mac !== '00:00:00:00:00:00') {
        return iface.mac.toUpperCase().replace(/:/g, ':');
      }
    }
  }
  return '00:00:00:00:00:00';
}

/**
 * Get the system's public IP via ipify
 */
async function getPublicIP() {
  try {
    const res = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    return res.data.ip;
  } catch (err) {
    console.warn('Could not fetch public IP, using local IP as fallback');
    return getLocalIP();
  }
}

/**
 * Build common headers for AngelOne API calls
 */
function buildHeaders(apiKey, authToken, localIP, publicIP, macAddress) {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-UserType': 'USER',
    'X-SourceID': 'WEB',
    'X-ClientLocalIP': localIP,
    'X-ClientPublicIP': publicIP,
    'X-MACAddress': macAddress,
    'X-PrivateKey': apiKey,
  };
}

/**
 * Generate a session (login) with AngelOne and get the JWT auth token.
 * Uses TOTP auto-generation via otplib.
 */
async function generateSession() {
  const apiKey = process.env.ANGELONE_API_KEY;
  const clientCode = process.env.ANGELONE_CLIENT_CODE;
  const password = process.env.ANGELONE_PASSWORD;
  const totpSecret = process.env.ANGELONE_TOTP_SECRET;

  if (!apiKey || !clientCode || !password || !totpSecret) {
    throw new Error(
      'AngelOne credentials not configured. Set ANGELONE_API_KEY, ANGELONE_CLIENT_CODE, ANGELONE_PASSWORD, and ANGELONE_TOTP_SECRET in your .env file.'
    );
  }

  const totp = generateTOTP(totpSecret);
  const localIP = getLocalIP();
  const publicIP = await getPublicIP();
  const macAddress = getMACAddress();

  const loginUrl = `${ANGELONE_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`;

  const response = await axios.post(
    loginUrl,
    {
      clientcode: clientCode,
      password: password,
      totp: totp,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-UserType': 'USER',
        'X-SourceID': 'WEB',
        'X-ClientLocalIP': localIP,
        'X-ClientPublicIP': publicIP,
        'X-MACAddress': macAddress,
        'X-PrivateKey': apiKey,
      },
    }
  );

  if (!response.data || !response.data.data || !response.data.data.jwtToken) {
    throw new Error('AngelOne login failed: ' + JSON.stringify(response.data));
  }

  return {
    authToken: response.data.data.jwtToken,
    refreshToken: response.data.data.refreshToken,
    feedToken: response.data.data.feedToken,
    localIP,
    publicIP,
    macAddress,
  };
}

/**
 * Fetch all holdings from AngelOne API.
 * Handles auth automatically.
 */
async function fetchHoldings() {
  const apiKey = process.env.ANGELONE_API_KEY;

  // Step 1: Login and get auth token
  const session = await generateSession();

  // Step 2: Call getAllHolding
  const holdingsUrl = `${ANGELONE_BASE_URL}/rest/secure/angelbroking/portfolio/v1/getAllHolding`;

  const response = await axios.get(holdingsUrl, {
    headers: buildHeaders(apiKey, session.authToken, session.localIP, session.publicIP, session.macAddress),
  });

  if (!response.data || !response.data.data || !response.data.data.holdings) {
    console.warn('AngelOne getAllHolding response:', JSON.stringify(response.data));
    return [];
  }

  return response.data.data.holdings;
}

/**
 * Generate a random date between today and 5 years ago.
 */
function generateRandomDate() {
  const now = new Date();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);

  const timeDiff = now.getTime() - fiveYearsAgo.getTime();
  const randomTime = Math.random() * timeDiff;

  return new Date(fiveYearsAgo.getTime() + randomTime);
}

/**
 * Normalize AngelOne API holdings into our DB schema.
 * Maps AngelOne fields → our HoldingSchema fields.
 * Attaches a random dateOfPurchase.
 */
function normalizeHoldings(angelOneHoldings) {
  return angelOneHoldings.map(holding => ({
    tradingSymbol: holding.tradingsymbol || holding.tradingSymbol || 'UNKNOWN',
    exchange: holding.exchange || 'NSE',
    isin: holding.isin || '',
    quantity: Number(holding.quantity || holding.t1quantity || 0),
    product: holding.product === 'DELIVERY' || holding.product === 'CNC'
      ? 'Delivered'
      : 'Not Delivered',
    averagePrice: Number(holding.averageprice || holding.averagePrice || 0),
    profitandloss: Number(holding.profitandloss || holding.pnl || 0),
    pnlpercentage: Number(holding.pnlpercentage || 0),
    dateOfPurchase: generateRandomDate(),
  }));
}

module.exports = {
  fetchHoldings,
  normalizeHoldings,
  generateSession,
  generateRandomDate,
};
