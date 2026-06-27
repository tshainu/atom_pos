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
  RIGHT:       [0x1b, 0x61, 0x02],        // ESC a 2 — right align
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
 * Tags (wrap entire lines, no mid-line mixing):
 *   <B>   bold
 *   <D>   double height (implies bold)
 *   <C>   center align
 *   <CB>  center + bold
 *   <CD>  center + double (implies bold)
 *   <R>   right align
 *   <L>   left align (default)
 */
export function buildRawBase64(text: string): string {
  const bytes: number[] = [...B.INIT, ...B.LEFT];

  const lines = text.split("\n");
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    let isBold = false;
    let isDouble = false;
    let isCenter = false;
    let isRight = false;

    // Combined tags first
    if (line.includes("<CD>") && line.includes("</CD>")) {
      isCenter = true; isDouble = true; isBold = true;
      line = line.replace(/<\/?CD>/g, "");
    } else if (line.includes("<CB>") && line.includes("</CB>")) {
      isCenter = true; isBold = true;
      line = line.replace(/<\/?CB>/g, "");
    } else if (line.includes("<RB>") && line.includes("</RB>")) {
      isRight = true; isBold = true;
      line = line.replace(/<\/?RB>/g, "");
    } else {
      // Single tags
      if (line.includes("<B>") && line.includes("</B>")) {
        isBold = true;
        line = line.replace(/<\/?B>/g, "");
      }
      if (line.includes("<D>") && line.includes("</D>")) {
        isDouble = true; isBold = true;
        line = line.replace(/<\/?D>/g, "");
      }
      if (line.includes("<C>") && line.includes("</C>")) {
        isCenter = true;
        line = line.replace(/<\/?C>/g, "");
      }
      if (line.includes("<R>") && line.includes("</R>")) {
        isRight = true;
        line = line.replace(/<\/?R>/g, "");
      }
      if (line.includes("<L>") && line.includes("</L>")) {
        line = line.replace(/<\/?L>/g, "");
      }
    }

    // Apply alignment
    if (isCenter) bytes.push(...B.CENTER);
    else if (isRight) bytes.push(...B.RIGHT);
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

  // Small feed before cut
  bytes.push(...B.LF);
  bytes.push(...B.CUT);

  // Build string via loop — spread on large arrays crashes the call stack
  let bStr = "";
  for (let i = 0; i < bytes.length; i++) bStr += String.fromCharCode(bytes[i]);
  return btoa(bStr);
}

/**
 * Full connect → print → disconnect with retry.
 * All BLE print sites should use this.
 */
export async function bleConnectAndPrint(BLEPrinter: any, address: string, text: string): Promise<void> {
  try { await BLEPrinter.init(); } catch (_) {}

  let connected = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await BLEPrinter.connectPrinter(address);
      connected = true;
      break;
    } catch {
      if (attempt === 2) throw new Error("Could not connect to printer. Make sure it is on and paired.");
      try { await BLEPrinter.closeConn(); } catch (_) {}
      await sleep(300);
      try { await BLEPrinter.init(); } catch (_) {}
    }
  }

  if (!connected) throw new Error("Could not connect to printer.");

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

  const sep   = (ch: string) => ch.repeat(colWidth);
  const ctrB  = (s: string)  => `<CB>${s}</CB>`;
  const ctr   = (s: string)  => `<C>${s}</C>`;
  const rgtB  = (s: string)  => `<RB>${s}</RB>`;
  const rgt   = (s: string)  => `<R>${s}</R>`;
  const bold  = (s: string)  => `<B>${s}</B>`;
  const big   = (s: string)  => `<CD>${s}</CD>`;

  // Manual center padding — works even if printer ignores ESC/POS alignment
  const manualCenter = (s: string) => {
    const trimmed = s.slice(0, colWidth);
    const pad = Math.max(0, Math.floor((colWidth - trimmed.length) / 2));
    return " ".repeat(pad) + trimmed;
  };

  const lr = (label: string, value: string) => {
    const space = Math.max(1, colWidth - label.length - value.length);
    return label + " ".repeat(space) + value;
  };
  const lrBold = (label: string, value: string) => bold(lr(label, value));

  // Items: "#1. Item Name" then "  qty.00 x price.00.....total.00"
  const itemLines = rd.items.map((it, i) => {
    const unit  = it.pricePerItem ?? (it.qty ? Math.round(it.total / it.qty) : it.total);
    const head  = `#${i + 1}. ${it.itemName}`;
    const left  = `  ${it.qty}.00 x ${unit.toLocaleString()}.00`;
    const right = `${it.total.toLocaleString()}.00`;
    const dots  = ".".repeat(Math.max(1, colWidth - left.length - right.length));
    const line2 = `${left}${dots}${right}`;
    return `${head}\n${line2}`;
  }).join("\n");

  const pmLabel = rd.isCredit
    ? "Credit"
    : rd.paymentMethod.charAt(0).toUpperCase() + rd.paymentMethod.slice(1);

  const billNo = rd.billNumber.replace("BILL-", "");

  let t = "";

  // ── Header (manually centered — works on all printers) ──
  t += bold(manualCenter(rd.shopName)) + "\n";
  if (rd.shopAddress) t += manualCenter(rd.shopAddress) + "\n";
  if (rd.shopPhone)   t += manualCenter(rd.shopPhone) + "\n";
  t += sep("-") + "\n";
  if (rd.receiptHeader) t += manualCenter(rd.receiptHeader) + "\n";

  // ── Invoice info ──
  t += lr("Invoice No.", billNo) + "\n";
  t += lr("Date", rd.printedAt) + "\n";
  if (rd.isCredit && rd.customerName) {
    t += bold("Customer") + "\n";
    t += rd.customerName + "\n";
    if (rd.customerPhone) t += `Mobile: ${rd.customerPhone}\n`;
  }
  t += sep(".") + "\n";

  // ── Items ──
  t += itemLines + "\n";
  t += sep(".") + "\n";

  // ── Totals ──
  if (rd.subtotal !== rd.netPay || rd.discount > 0) {
    t += lrBold("Subtotal:", `Rs ${rd.subtotal.toLocaleString()}.00`) + "\n";
  }
  if (rd.discount > 0) {
    t += lr("Discount:", `-Rs ${rd.discount.toLocaleString()}.00`) + "\n";
  }
  t += lrBold("Total:", `Rs ${rd.netPay.toLocaleString()}.00`) + "\n";

  if (!rd.isCredit) {
    t += lr(`${pmLabel} (${rd.printedAt.split(" ")[0]})`, `Rs ${rd.cashPaid.toLocaleString()}.00`) + "\n";
    t += lr("Total Paid", `Rs ${rd.cashPaid.toLocaleString()}.00`) + "\n";
    const due = rd.cashPaid - rd.netPay;
    if (due < 0) {
      t += lr("Total Due", `Rs ${Math.abs(due).toLocaleString()}.00`) + "\n";
    } else if (due > 0) {
      t += lr("Balance", `Rs ${due.toLocaleString()}.00`) + "\n";
    }
  }

  if (rd.isCredit) {
    t += sep("-") + "\n";
    t += ctrB("** CREDIT SALE **") + "\n";
    if (rd.creditDate) t += lr("Due Date:", rd.creditDate) + "\n";
  }

  // ── Footer ──
  t += sep("-") + "\n";
  if (rd.receiptFooter) t += ctr(rd.receiptFooter) + "\n";
  t += ctr("Thank you for your Trust!") + "\n";

  return t;
}
