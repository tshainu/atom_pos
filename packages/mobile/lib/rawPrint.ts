/**
 * rawPrint.ts
 *
 * Builds ESC/POS bytes manually and sends via BLEPrinter.printRaw (base64).
 * Bypasses the library's iconv encoding path which causes blank output on
 * MPrinter P10 and similar printers.
 */

const ESC_INIT   = [0x1b, 0x40];             // ESC @ — initialise printer
const ESC_CUT    = [0x1d, 0x56, 0x41, 0x00]; // GS V A 0 — full cut
const FEED_LINES = [0x0a, 0x0a, 0x0a, 0x0a]; // 4x LF feed before cut

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Convert plain-text receipt string to base64 ESC/POS payload.
 * Only ASCII printable chars (0x20–0x7e) + \n survive on most thermal printers.
 */
export function buildRawBase64(text: string): string {
  const textBytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code === 0x0a) {
      textBytes.push(0x0a);
    } else if (code >= 0x20 && code <= 0x7e) {
      textBytes.push(code);
    } else {
      textBytes.push(0x3f); // '?' for unsupported chars
    }
  }
  const allBytes = [...ESC_INIT, ...textBytes, ...FEED_LINES, ...ESC_CUT];
  return btoa(String.fromCharCode(...allBytes));
}

/**
 * Full connect → print → disconnect flow with retry.
 * Handles stale connections from previous sessions.
 * Throws with a user-readable message on failure.
 */
export async function bleConnectAndPrint(BLEPrinter: any, address: string, text: string): Promise<void> {
  // Always reset state first
  try { await BLEPrinter.init(); } catch (_) {}
  await sleep(400);
  try { await BLEPrinter.closeConn(); } catch (_) {}
  await sleep(400);

  // Try connecting — retry once on failure (stale socket race condition)
  let connected = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await BLEPrinter.connectPrinter(address);
      connected = true;
      break;
    } catch (e: any) {
      if (attempt === 2) {
        throw new Error("Could not connect to printer. Make sure it is on and paired.");
      }
      // Close and wait before retry
      try { await BLEPrinter.closeConn(); } catch (_) {}
      await sleep(800);
      try { await BLEPrinter.init(); } catch (_) {}
      await sleep(400);
    }
  }

  if (!connected) throw new Error("Could not connect to printer.");

  await sleep(500);

  try {
    const raw = buildRawBase64(text);
    await BLEPrinter.printRaw(raw);
  } catch (e: any) {
    throw new Error(e?.message || "Connected but could not print.");
  } finally {
    try { await BLEPrinter.closeConn(); } catch (_) {}
  }
}

/**
 * Send plain-text receipt to an already-connected BLEPrinter instance.
 * Use bleConnectAndPrint instead unless you manage connection yourself.
 */
export async function sendRawBLEPrint(BLEPrinter: any, text: string): Promise<void> {
  const raw = buildRawBase64(text);
  await BLEPrinter.printRaw(raw);
}
