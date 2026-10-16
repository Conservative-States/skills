/**
 * Reference verifier for Conservative States webhooks (X-CS-Signature).
 *
 *   X-CS-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, "<t>.<raw body>")>
 *
 * Pass the RAW request body (string or Buffer) exactly as received — never
 * re-serialized JSON. `secrets` holds the current signing secret first and, during
 * a rotation, the previous one.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function verifyConservativeStatesSignature(
  rawBody: string | Buffer,
  header: string | null | undefined,
  secrets: readonly string[],
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || secrets.length === 0) return false;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    else if (key === 'v1') signatures.push(value);
  }
  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) return false;

  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  for (const secret of secrets) {
    const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(body).digest();
    for (const signature of signatures) {
      // timingSafeEqual throws on unequal lengths: check the shape first.
      if (!/^[0-9a-fA-F]{64}$/.test(signature)) continue;
      if (timingSafeEqual(Buffer.from(signature, 'hex'), expected)) return true;
    }
  }
  return false;
}

/** Sign a body the way Conservative States does — for your own tests. */
export function signForTest(secret: string, rawBody: string, timestamp: number): string {
  const v1 = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${v1}`;
}
