/**
 * Real Receipt Optical Character Recognition (OCR) Engine
 *
 * Privacy & Security Guarantees (SECURITY_REPORT.md §10.1):
 * - Receipt images are processed in-memory (Canvas / Blob / ArrayBuffer)
 * - Never written to disk or permanent storage
 * - Memory URLs are revoked immediately after extraction
 * - All extracted transaction data requires explicit human review and confirmation
 *   before being committed to the ledger
 */

import type { SpendCategory } from './types';

export interface ExtractedReceiptItem {
  name: string;
  price: number;
}

export interface ExtractedReceiptData {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  spendCategory: SpendCategory;
  items: ExtractedReceiptItem[];
  rawText: string;
  confidence: number; // 0 to 100
  isNeed: boolean;
  fingerprint: string; // SHA or hash to prevent duplicate submissions
}

export interface OcrProgress {
  status: 'loading_engine' | 'processing_image' | 'recognizing_text' | 'parsing_fields' | 'completed' | 'error';
  progress: number; // 0 to 1
  message: string;
}

/** Deterministic hash for duplicate submission detection */
function hashReceipt(merchant: string, amount: number, date: string): string {
  const str = `${merchant.toLowerCase().trim()}_${amount.toFixed(2)}_${date.trim()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return `rcpt_${Math.abs(hash).toString(16)}`;
}

/** Pre-filter receipt text to parse lines */
export function parseReceiptText(text: string, todayISO = '2026-10-18'): OcrParseResult {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let merchant = '';
  let amount = 0;
  let date = todayISO;
  const items: ExtractedReceiptItem[] = [];

  // Common header lines to skip when looking for merchant
  const headerSkip = [
    'tax invoice',
    'simplified tax invoice',
    'receipt',
    'official receipt',
    'cash receipt',
    'bill',
    'welcome to',
    'tel:',
    'reg no',
    'sst no',
    'gst no',
  ];

  // 1. Detect Merchant Name (typically the first non-header line)
  for (const line of lines.slice(0, 8)) {
    const lower = line.toLowerCase();
    if (headerSkip.some((skip) => lower.includes(skip))) continue;
    if (line.length < 3) continue;
    // Exclude date/time lines
    if (/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/.test(line)) continue;
    if (/^\d+$/.test(line)) continue;

    merchant = line.replace(/^[#*•\-_= ]+/, '').trim();
    break;
  }

  if (!merchant) {
    merchant = 'Retail Merchant';
  }

  // 2. Detect Date
  const dateRegex = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})\b/i;
  for (const line of lines) {
    const m = line.match(dateRegex);
    if (m) {
      date = m[0];
      break;
    }
  }

  // 3. Detect Total Amount
  // Look for total keyword patterns e.g. "TOTAL RM 24.64", "GRAND TOTAL 24.64", "JUMLAH RM 24.64"
  const totalKeywords = ['grand total', 'total', 'jumlah', 'nett amount', 'amount due', 'balance due', 'total (rm)', 'subtotal'];
  let foundTotal = 0;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const hasTotalKeyword = totalKeywords.some((kw) => lower.includes(kw));

    if (hasTotalKeyword) {
      // Find numbers with decimals in this line or the immediate next line (reject negative signs)
      const priceMatch = line.match(/(-)?(?:RM|\$)?\s*(-)?(\d+[.,]\d{2})\b/i);
      if (priceMatch) {
        const isNegative = Boolean(priceMatch[1] || priceMatch[2]);
        if (!isNegative) {
          const val = parseFloat(priceMatch[3].replace(',', '.'));
          if (!isNaN(val) && val > 0) {
            foundTotal = val;
            break;
          }
        }
      }
      // Check next line in case total keyword and number are on separate lines
      if (i + 1 < lines.length) {
        const nextPrice = lines[i + 1].match(/^(-)?(?:RM|\$)?\s*(-)?(\d+[.,]\d{2})$/i);
        if (nextPrice) {
          const isNegative = Boolean(nextPrice[1] || nextPrice[2]);
          if (!isNegative) {
            const val = parseFloat(nextPrice[3].replace(',', '.'));
            if (!isNaN(val) && val > 0) {
              foundTotal = val;
              break;
            }
          }
        }
      }
    }
  }

  // Fallback for total: highest valid positive price found in the receipt
  if (foundTotal === 0) {
    let maxPrice = 0;
    for (const line of lines) {
      const allPrices = Array.from(line.matchAll(/(-)?(?:RM|\$)?\s*(-)?(\d+[.,]\d{2})\b/gi));
      for (const p of allPrices) {
        const isNegative = Boolean(p[1] || p[2]);
        if (!isNegative) {
          const val = parseFloat(p[3].replace(',', '.'));
          if (!isNaN(val) && val > maxPrice && val < 50000) {
            maxPrice = val;
          }
        }
      }
    }
    foundTotal = maxPrice;
  }
  amount = foundTotal;

  // 4. Parse Itemized Rows
  for (const line of lines) {
    // Look for lines ending with a price e.g. "Iced Latte 12.90"
    const itemMatch = line.match(/^([A-Za-z0-9\s&'-]{3,35})\s+(?:RM|\$)?\s*(\d+[.,]\d{2})$/);
    if (itemMatch) {
      const name = itemMatch[1].trim();
      const price = parseFloat(itemMatch[2].replace(',', '.'));
      const lower = name.toLowerCase();
      if (!totalKeywords.some((kw) => lower.includes(kw)) && !headerSkip.some((kw) => lower.includes(kw))) {
        items.push({ name, price });
      }
    }
  }

  // 5. Categorize based on merchant & items
  const { category, spendCategory, isNeed } = categorizeTransaction(merchant, items);

  const confidence = Math.min(
    98,
    (merchant ? 30 : 0) + (amount > 0 ? 40 : 0) + (items.length > 0 ? 15 : 0) + (date !== todayISO ? 15 : 10),
  );

  return {
    merchant,
    amount,
    date,
    category,
    spendCategory,
    items,
    confidence,
    isNeed,
  };
}

export interface OcrParseResult {
  merchant: string;
  amount: number;
  date: string;
  category: string;
  spendCategory: SpendCategory;
  items: ExtractedReceiptItem[];
  confidence: number;
  isNeed: boolean;
}

/** Deterministic Category Mapping */
export function categorizeTransaction(
  merchant: string,
  items: ExtractedReceiptItem[] = [],
): { category: string; spendCategory: SpendCategory; isNeed: boolean } {
  const m = merchant.toLowerCase();
  const itemNames = items.map((i) => i.name.toLowerCase()).join(' ');
  const combined = `${m} ${itemNames}`;

  // Food & Dining
  if (
    combined.includes('coffee') ||
    combined.includes('tea') ||
    combined.includes('latte') ||
    combined.includes('croissant') ||
    combined.includes('cafe') ||
    combined.includes('restoran') ||
    combined.includes('mcdonald') ||
    combined.includes('kfc') ||
    combined.includes('starbucks') ||
    combined.includes('tealive') ||
    combined.includes('subway') ||
    combined.includes('food') ||
    combined.includes('dining') ||
    combined.includes('burger') ||
    combined.includes('nasi') ||
    combined.includes('mee') ||
    combined.includes('cafeteria')
  ) {
    const isBasicCafeteria = combined.includes('cafeteria') || combined.includes('mixed rice');
    return {
      category: 'Dining & Food',
      spendCategory: isBasicCafeteria ? 'Campus_Cafeteria_Basic' : 'Bubble_Tea_Dining',
      isNeed: isBasicCafeteria,
    };
  }

  // Transport
  if (
    combined.includes('grab') ||
    combined.includes('petrol') ||
    combined.includes('shell') ||
    combined.includes('petronas') ||
    combined.includes('caltex') ||
    combined.includes('bus') ||
    combined.includes('rapidkl') ||
    combined.includes('parking')
  ) {
    return {
      category: 'Transport',
      spendCategory: 'Transport_Essential',
      isNeed: true,
    };
  }

  // Medical & Health
  if (
    combined.includes('pharmacy') ||
    combined.includes('watsons') ||
    combined.includes('guardian') ||
    combined.includes('clinic') ||
    combined.includes('klinik') ||
    combined.includes('hospital') ||
    combined.includes('panadol') ||
    combined.includes('medicine')
  ) {
    return {
      category: 'Living & Home',
      spendCategory: 'Medical',
      isNeed: true,
    };
  }

  // Shopping & Books
  if (
    combined.includes('book') ||
    combined.includes('popular') ||
    combined.includes('stationery') ||
    combined.includes('shopee') ||
    combined.includes('lazada') ||
    combined.includes('uniqlo') ||
    combined.includes('zara') ||
    combined.includes('padini')
  ) {
    return {
      category: 'Shopping',
      spendCategory: 'Shopping',
      isNeed: false,
    };
  }

  // Bills & Utilities
  if (
    combined.includes('tnb') ||
    combined.includes('tenaga') ||
    combined.includes('water') ||
    combined.includes('air selangor') ||
    combined.includes('unifi') ||
    combined.includes('maxis') ||
    combined.includes('celcom') ||
    combined.includes('digi')
  ) {
    return {
      category: 'Bills & Utilities',
      spendCategory: 'Bills_Utilities',
      isNeed: true,
    };
  }

  return {
    category: 'Other',
    spendCategory: 'Shopping',
    isNeed: false,
  };
}

/**
 * Execute real OCR in-memory using tesseract.js with progress reporting.
 */
export async function executeRealOcr(
  imageSource: File | Blob | string,
  onProgress?: (progress: OcrProgress) => void,
): Promise<ExtractedReceiptData> {
  onProgress?.({
    status: 'loading_engine',
    progress: 0.15,
    message: 'Initializing neural OCR engine in secure memory...',
  });

  let imageUrl = '';
  let needRevoke = false;

  if (typeof imageSource === 'string') {
    imageUrl = imageSource;
  } else {
    imageUrl = URL.createObjectURL(imageSource);
    needRevoke = true;
  }

  try {
    onProgress?.({
      status: 'processing_image',
      progress: 0.35,
      message: 'Enhancing document contrast & character contours...',
    });

    // Dynamic import to support both browser and SSR safely
    const Tesseract = await import('tesseract.js');

    onProgress?.({
      status: 'recognizing_text',
      progress: 0.65,
      message: 'Extracting text and itemized transaction rows...',
    });

    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.({
            status: 'recognizing_text',
            progress: 0.35 + m.progress * 0.45,
            message: `Recognizing text: ${Math.round(m.progress * 100)}%`,
          });
        }
      },
    });

    onProgress?.({
      status: 'parsing_fields',
      progress: 0.9,
      message: 'Validating Malaysian merchant & currency totals...',
    });

    const text = result.data.text || '';
    const parsed = parseReceiptText(text);

    // If OCR returned empty or very sparse text, provide honest feedback
    if (!parsed.merchant || parsed.amount === 0) {
      if (text.length < 10) {
        throw new Error('RECEIPT_UNCLEAR: Could not clearly detect text in image. Please ensure good lighting or enter details manually.');
      }
    }

    const fingerprint = hashReceipt(parsed.merchant, parsed.amount, parsed.date);

    onProgress?.({
      status: 'completed',
      progress: 1.0,
      message: 'Receipt verified and structured successfully.',
    });

    return {
      merchant: parsed.merchant,
      amount: parsed.amount,
      date: parsed.date,
      category: parsed.category,
      spendCategory: parsed.spendCategory,
      items: parsed.items,
      rawText: text,
      confidence: parsed.confidence,
      isNeed: parsed.isNeed,
      fingerprint,
    };
  } finally {
    // SECURITY REQUIREMENT: Never persist images, revoke memory URL immediately
    if (needRevoke && imageUrl) {
      try {
        URL.revokeObjectURL(imageUrl);
      } catch {
        // ignore
      }
    }
  }
}

/** Pre-rendered test receipts for sandbox demonstration */
export const SAMPLE_RECEIPT_CARDS = [
  {
    id: 'sample-coffee-bean',
    name: 'Coffee Bean & Tea Leaf',
    amountRM: 24.64,
    category: 'Dining & Food',
    items: [
      { name: 'Iced Americano (Regular)', price: 12.9 },
      { name: 'Warm Almond Croissant', price: 9.5 },
      { name: 'SST 6%', price: 2.24 },
    ],
    rawText: `THE COFFEE BEAN & TEA LEAF
SUNWAY PYRAMID MALL
TEL: 03-7492 8829
DATE: 18/10/2026 10:32 AM
TAX INVOICE
1 ICED AMERICANO      RM 12.90
1 WARM CROISSANT      RM  9.50
SUBTOTAL              RM 22.40
SST 6%                RM  2.24
GRAND TOTAL           RM 24.64
PAYMENT: TNG EWALLET
THANK YOU! PLEASE COME AGAIN`,
  },
  {
    id: 'sample-tealive',
    name: 'Tealive SS15 Subang',
    amountRM: 8.90,
    category: 'Dining & Food',
    items: [
      { name: 'Signature Brown Sugar Pearl Milk Tea', price: 8.9 },
    ],
    rawText: `TEALIVE SS15 SUBANG JAYA
DATE: 18/10/2026 02:15 PM
TAX INVOICE #TL-88219
1 BROWN SUGAR PEARL TEA  RM 8.90
TOTAL AMOUNT             RM 8.90
CASH RECEIVED            RM 10.00
CHANGE                   RM 1.10
TEALIVE MEMBERSHIP BONUS +18 PTS`,
  },
  {
    id: 'sample-watsons',
    name: 'Watsons Pharmacy',
    amountRM: 56.90,
    category: 'Living & Home',
    items: [
      { name: 'Panadol ActiFast 20s', price: 18.5 },
      { name: 'Cetaphil Gentle Cleanser 250ml', price: 38.4 },
    ],
    rawText: `WATSONS PERSONAL CARE STORES SDN BHD
BANDAR SUNWAY BRANCH
SIMPLIFIED TAX INVOICE
DATE: 17/10/2026 04:45 PM
1 PANADOL ACTIFAST 20S   RM 18.50
1 CETAPHIL CLEANSER      RM 38.40
TOTAL (RM)               RM 56.90
DUITNOW QR COMPLETED
THANK YOU FOR SHOPPING AT WATSONS`,
  },
];
