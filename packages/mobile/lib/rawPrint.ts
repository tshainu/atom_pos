/**
 * rawPrint.ts
 *
 * Manual ESC/POS byte builder — bypasses the library's iconv encoding path.
 * Supports inline tags for formatting:
 *   <B>text</B>   — bold
 *   <D>text</D>   — double height+width (big)
 *   <C>text</C>   — center align
 *   <L>text</L>   — left align (default)
 */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ESC/POS byte sequences
const B = {
  INIT:        [0x1b, 0x40],              // ESC @  — init
  LEFT:        [0x1b, 0x61, 0x00],        // ESC a 0 — left align
  CENTER:      [0x1b, 0x61, 0x01],        // ESC a 1 — center align
  BOLD_ON:     [0x1b, 0x45, 0x01],        // ESC E 1 — bold on
  BOLD_OFF:    [0x1b, 0x45, 0x00],        // ESC E 0 — bold off
  DOUBLE_ON:   [0x1d, 0x21, 0x01],        // GS ! 0x01 — double height only (no width — 58mm wraps with double-width)
  DOUBLE_OFF:  [0x1d, 0x21, 0x00],        // GS ! 0 — normal size
  RESET:       [0x1b, 0x61, 0x00, 0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00], // left+normal+nobold
  LF:          [0x0a],                    // line feed
  FEED:        [0x0a],
  CUT:         [0x1d, 0x56, 0x41, 0x03], // GS V A 3 — partial cut with small feed
};

function strToBytes(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 0x0a) out.push(0x0a);
    else if (c >= 0x20 && c <= 0x7e) out.push(c);
    else out.push(0x3f); // '?' for non-ASCII
  }
  return out;
}

/**
 * Parse tagged receipt text into ESC/POS bytes.
 * Tags: <B></B> bold, <D></D> double size, <C></C> center, <L></L> left
 * Tags must wrap entire lines (no mid-line mixing).
 */
export function buildRawBase64(text: string): string {
  const bytes: number[] = [...B.INIT, ...B.LEFT];

  const lines = text.split("\n");
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    let isBold = false;
    let isDouble = false;
    let isCenter = false;

    // Extract formatting tags
    if (line.includes("<B>") && line.includes("</B>")) {
      isBold = true;
      line = line.replace(/<\/?B>/g, "");
    }
    if (line.includes("<D>") && line.includes("</D>")) {
      isDouble = true;
      isBold = true; // double implies bold
      line = line.replace(/<\/?D>/g, "");
    }
    if (line.includes("<C>") && line.includes("</C>")) {
      isCenter = true;
      line = line.replace(/<\/?C>/g, "");
    }
    if (line.includes("<L>") && line.includes("</L>")) {
      line = line.replace(/<\/?L>/g, "");
    }

    // Apply alignment
    if (isCenter) bytes.push(...B.CENTER);
    else bytes.push(...B.LEFT);

    // Apply size/bold
    if (isDouble) bytes.push(...B.DOUBLE_ON);
    else if (isBold) bytes.push(...B.BOLD_ON);

    // Write text content
    bytes.push(...strToBytes(line));

    // Reset after each line
    bytes.push(...B.RESET);
    bytes.push(...B.LF);
  }

  // Small feed before cut (1 line instead of 4)
  bytes.push(...B.LF);
  bytes.push(...B.CUT);

  return btoa(String.fromCharCode(...bytes));
}

/**
 * Full connect → print → disconnect with retry.
 * All BLE print sites should use this.
 */
export async function bleConnectAndPrint(BLEPrinter: any, address: string, text: string): Promise<void> {
  try { await BLEPrinter.init(); } catch (_) {}
  await sleep(400);
  try { await BLEPrinter.closeConn(); } catch (_) {}
  await sleep(400);

  let connected = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await BLEPrinter.connectPrinter(address);
      connected = true;
      break;
    } catch {
      if (attempt === 2) throw new Error("Could not connect to printer. Make sure it is on and paired.");
      try { await BLEPrinter.closeConn(); } catch (_) {}
      await sleep(800);
      try { await BLEPrinter.init(); } catch (_) {}
      await sleep(400);
    }
  }

  if (!connected) throw new Error("Could not connect to printer.");
  await sleep(500);

  try {
    await BLEPrinter.printRaw(buildRawBase64(text));
  } catch (e: any) {
    throw new Error(e?.message || "Connected but could not print.");
  } finally {
    try { await BLEPrinter.closeConn(); } catch (_) {}
  }
}

/** @deprecated use bleConnectAndPrint */
export async function sendRawBLEPrint(BLEPrinter: any, text: string): Promise<void> {
  await BLEPrinter.printRaw(buildRawBase64(text));
}

// ─── Receipt text builder ──────────────────────────────────────────────────

export interface ReceiptData {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  paperWidth: string;
  billNumber: string;
  printedAt: string;
  paymentMethod: string;
  isCredit: boolean;
  customerName?: string;
  customerPhone?: string;
  creditDate?: string;
  items: Array<{
    itemName: string;
    qty: number;
    pricePerItem?: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  netPay: number;
  cashPaid: number;
  balance: number;
}

export function buildReceiptText(rd: ReceiptData): string {
  const is80 = rd.paperWidth !== "58mm";
  const colWidth = is80 ? 42 : 32;
  const padW = is80 ? 26 : 18;

  const sep  = (ch: string) => ch.repeat(colWidth);
  const ctr  = (s: string)  => `<C>${s}</C>`;
  const bold = (s: string)  => `<B>${s}</B>`;
  const big  = (s: string)  => `<D>${s}</D>`;

  const nc = is80 ? 20 : 14;
  const itemLines = rd.items.map((it, i) => {
    const num  = `${i + 1}.`.padEnd(3);
    const name = it.itemName.slice(0, nc).padEnd(nc);
    const qty  = `x${it.qty}`.padStart(4);
    const price = `Rs.${(it.pricePerItem ?? (it.qty ? Math.round(it.total / it.qty) : it.total)).toLocaleString()}`;
    const total = `  Total: Rs.${it.total.toLocaleString()}`;
    return `${num}${name}${qty} ${price}\n${" ".repeat(nc + 3)}${total}`;
  }).join("\n");

  const pmLabel = rd.isCredit
    ? "Credit"
    : rd.paymentMethod.charAt(0).toUpperCase() + rd.paymentMethod.slice(1);

  const billNo = rd.billNumber.replace("BILL-", "");

  let t = "";

  // ── Header ──
  t += ctr(bold(rd.shopName)) + "\n";
  if (rd.shopAddress) t += ctr(rd.shopAddress) + "\n";
  if (rd.shopPhone)   t += ctr("Tel: " + rd.shopPhone) + "\n";
  t += sep("=") + "\n";
  if (rd.receiptHeader) t += ctr(rd.receiptHeader) + "\n";

  // ── Bill info ──
  t += bold(`Bill: ${billNo}`) + `   ${rd.printedAt}\n`;
  t += `Payment: ${pmLabel}\n`;
  t += sep("-") + "\n";

  // ── Items header ──
  t += bold(`${"No.".padEnd(3)}${"Item".padEnd(nc)}${"Qty".padStart(4)} Price`) + "\n";
  t += sep("-") + "\n";

  // ── Items ──
  t += itemLines + "\n";
  t += sep("-") + "\n";

  // ── Totals ──
  t += `Subtotal:`.padEnd(padW) + `Rs.${rd.subtotal.toLocaleString()}\n`;
  if (rd.discount > 0)
    t += `Discount:`.padEnd(padW) + `-Rs.${rd.discount.toLocaleString()}\n`;
  t += sep("-") + "\n";
  t += big(`Total: Rs.${rd.netPay.toLocaleString()}`) + "\n";
  t += sep("-") + "\n";
  if (!rd.isCredit) {
    t += `Total Paid:`.padEnd(padW) + `Rs.${rd.cashPaid.toLocaleString()}\n`;
    t += `Balance:`.padEnd(padW)    + `Rs.${rd.balance.toLocaleString()}\n`;
  }

  // ── Credit block ──
  if (rd.isCredit) {
    t += sep("=") + "\n";
    t += ctr(bold("** CREDIT SALE **")) + "\n";
    if (rd.customerName)  t += `Customer: ${rd.customerName}\n`;
    if (rd.customerPhone) t += `Phone:    ${rd.customerPhone}\n`;
    if (rd.creditDate)    t += `Due Date: ${rd.creditDate}\n`;
  }

  // ── Footer ──
  t += sep("=") + "\n";
  if (rd.receiptFooter) t += ctr(rd.receiptFooter) + "\n";
  t += ctr("ATOM POS by AxisXNOR") + "\n";

  return t;
}
