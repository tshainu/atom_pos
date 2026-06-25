/**
 * rawPrint.ts
 *
 * Builds ESC/POS bytes manually and sends via BLEPrinter.printRaw (base64).
 * Bypasses the library's iconv encoding path which causes blank output on
 * MPrinter P10 and similar printers.
 *
 * Usage:
 *   import { sendRawPrint } from "../../lib/rawPrint";
 *   await sendRawPrint(BLEPrinter, receiptText);
 */

const ESC_INIT  = [0x1b, 0x40];          // ESC @ — initialise printer
const ESC_CUT   = [0x1d, 0x56, 0x41, 0x00]; // GS V A 0 — full cut
const FEED_LINES = [0x0a, 0x0a, 0x0a, 0x0a]; // 4x LF feed before cut

/**
 * Convert plain-text receipt string to base64 ESC/POS payload.
 * Only ASCII printable chars (0x20–0x7e) + \n (0x0a) survive correctly
 * on most thermal printers. Non-ASCII chars are replaced with '?'.
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
 * Send plain-text receipt to a BLEPrinter instance via printRaw.
 * Throws on error (caller should catch and show Alert).
 */
export async function sendRawBLEPrint(BLEPrinter: any, text: string): Promise<void> {
  const raw = buildRawBase64(text);
  await BLEPrinter.printRaw(raw);
}
