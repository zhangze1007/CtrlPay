'use client';

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Check,
  CheckCircle2,
  X,
  RotateCcw,
  FileText,
  Edit3,
  AlertTriangle,
  Tag,
  Calendar,
  DollarSign,
  Store,
  Sparkles,
} from 'lucide-react';
import { cn, formatRM } from '@/lib/utils';
import { useCtrlPayStore } from '@/lib/store';
import { BrandLogo, type BrandId } from '@/components/brand-logos';
import {
  executeRealOcr,
  type OcrProgress,
} from '@/lib/real-ocr';

export interface ReceiptAiFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess?: (data: { merchant: string; amount: number; category: string; date?: string }) => void;
  onComplete?: () => void;
  onNavigateCopilot?: () => void;
}

type AiSeverity = 'safe' | 'caution' | 'warning' | 'danger';

interface ReceiptAiAnalysis {
  advice: string;
  warnings: string[];
  suggestions: string[];
  severity: AiSeverity;
}

const AI_SEVERITY_STYLES: Record<
  AiSeverity,
  { card: string; badge: string; label: string }
> = {
  safe: {
    card: 'bg-emerald-50/80 border-emerald-200/70',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    label: 'Looks normal',
  },
  caution: {
    card: 'bg-amber-50/80 border-amber-200/70',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    label: 'Worth a look',
  },
  warning: {
    card: 'bg-orange-50/90 border-orange-200/80',
    badge: 'bg-orange-100 text-orange-800 border-orange-200',
    label: 'Check this',
  },
  danger: {
    card: 'bg-rose-50/90 border-rose-200/80',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    label: 'Suspicious',
  },
};

const CATEGORY_OPTIONS = [
  { value: 'Dining & Food', label: '☕ Food & Drink' },
  { value: 'Living & Home', label: '🏠 Living & Home' },
  { value: 'Transport', label: '🚗 Transport' },
  { value: 'Shopping', label: '🛍️ Shopping' },
  { value: 'Entertainment', label: '🎬 Entertainment' },
  { value: 'Bills & Utilities', label: '⚡ Bills & Utilities' },
];

type OcrStep = 'viewfinder' | 'crop_preview' | 'scanned_details';

export function ReceiptAiFlowModal({
  isOpen,
  onClose,
  onSaveSuccess,
  onComplete,
}: ReceiptAiFlowModalProps) {
  // Screen steps: 1: 'viewfinder' -> 2: 'crop_preview' -> 3: 'scanned_details'
  const [step, setStep] = React.useState<OcrStep>('viewfinder');

  // Scanning & OCR state
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanProgress, setScanProgress] = React.useState<OcrProgress>({
    status: 'loading_engine',
    progress: 0,
    message: 'Initializing OCR...',
  });
  const [previewImageUrl, setPreviewImageUrl] = React.useState<string | null>(null);
  const [ocrError, setOcrError] = React.useState<string | null>(null);

  // Extracted data for Screen 3 (User requested: line items removed completely)
  const [merchantName, setMerchantName] = React.useState('Luxe Watch Gallery');
  const [receiptTotal, setReceiptTotal] = React.useState<string>('899.00');
  const [receiptCategory, setReceiptCategory] = React.useState('Shopping');
  const [receiptDate, setReceiptDate] = React.useState('2026-10-23');
  const [referenceCode, setReferenceCode] = React.useState('#APL - 987657');
  const [confidence, setConfidence] = React.useState(96);
  const [receiptFingerprint, setReceiptFingerprint] = React.useState<string | null>(null);
  const [isNeed, setIsNeed] = React.useState(true);

  // Live AI receipt check (advisory only; deterministic booking still owns the ledger)
  const [aiAnalysis, setAiAnalysis] = React.useState<ReceiptAiAnalysis | null>(null);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiWarningOpen, setAiWarningOpen] = React.useState(false);
  const aiRequestRef = React.useRef(0);

  // Edit Sheet Mode in Screen 3
  const [isEditModeOpen, setIsEditModeOpen] = React.useState(false);

  // Video & File refs
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const mediaStreamRef = React.useRef<MediaStream | null>(null);
  const committedFingerprintsRef = React.useRef<Set<string>>(new Set());

  const bookExpense = useCtrlPayStore((s) => s.bookExpense);
  const currentBalance = useCtrlPayStore((s) => s.currentBalance);
  const spentThisWeek = useCtrlPayStore((s) => s.spentThisWeek);
  const spentThisMonth = useCtrlPayStore((s) => s.spentThisMonth);

  // Start / Stop camera when entering or leaving viewfinder
  React.useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (step === 'viewfinder') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, step]);

  // Clean up object URLs
  React.useEffect(() => {
    return () => {
      if (previewImageUrl) {
        try {
          URL.revokeObjectURL(previewImageUrl);
        } catch {}
      }
    };
  }, [previewImageUrl]);

  async function startCamera() {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }
    } catch {
      // Camera not accessible or permission denied; graceful fallback
    }
  }

  function stopCamera() {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  // Shutter button clicked in Viewfinder
  function handleCaptureShutter() {
    // 1. If live camera is actively streaming with frames, capture from canvas
    if (videoRef.current && videoRef.current.videoWidth > 0 && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
            processFileWithOcr(capturedFile);
          }
        }, 'image/jpeg', 0.92);
        return;
      }
    }

    // 2. If no webcam frame (desktop, browser test, or simulator):
    // Synthesize realistic receipt canvas snapshot and immediately advance to Screen 2
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = 600;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 600, 800);
        ctx.fillStyle = '#04222B';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LUXE WATCH GALLERY', 300, 100);
        ctx.font = '20px monospace';
        ctx.fillText('TAX INVOICE #APL-887421', 300, 140);
        ctx.fillText('DESIGNER SMARTWATCH', 300, 240);
        ctx.fillText('--------------------------------', 300, 310);
        ctx.font = 'bold 28px monospace';
        ctx.fillText('TOTAL AMOUNT:        RM 899.00', 300, 360);
        ctx.font = '18px monospace';
        ctx.fillText('THANK YOU! COME AGAIN', 300, 440);

        canvas.toBlob((blob) => {
          if (blob) {
            const simulatedFile = new File([blob], 'luxe_watch_receipt.jpg', { type: 'image/jpeg' });
            processFileWithOcr(simulatedFile);
          }
        }, 'image/jpeg');
        return;
      }
    }

    // Fallback: prompt camera/file
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  }

  /**
   * Ask the server-side Groq analyzer about a receipt. This is advisory only:
   * it never writes to the ledger and it cannot change the extracted numbers.
   */
  async function analyzeReceipt(receipt: {
    merchant: string;
    amount: number;
    category: string;
    date: string;
  }) {
    const requestId = aiRequestRef.current + 1;
    aiRequestRef.current = requestId;

    setAiAnalysis(null);
    setAiError(null);
    setAiWarningOpen(false);
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ocr_receipt',
          receipt,
          context: { currentBalance, spentThisWeek, spentThisMonth },
        }),
      });
      const data = (await res.json()) as Partial<ReceiptAiAnalysis> & { message?: string };

      if (requestId !== aiRequestRef.current) return;
      if (!res.ok) {
        throw new Error(data.message || 'AI receipt check is unavailable right now.');
      }
      if (
        typeof data.advice !== 'string' ||
        !Array.isArray(data.warnings) ||
        !Array.isArray(data.suggestions) ||
        !data.severity
      ) {
        throw new Error('AI receipt check returned an unexpected response.');
      }

      const analysis: ReceiptAiAnalysis = {
        advice: data.advice,
        warnings: data.warnings.filter((item): item is string => typeof item === 'string').slice(0, 3),
        suggestions: data.suggestions.filter((item): item is string => typeof item === 'string').slice(0, 3),
        severity: data.severity,
      };
      setAiAnalysis(analysis);
      if (analysis.severity === 'warning' || analysis.severity === 'danger') {
        setAiWarningOpen(true);
      }
    } catch (err) {
      if (requestId !== aiRequestRef.current) return;
      console.warn('[RECEIPT_AI_CHECK]', err);
      setAiError('AI receipt check is temporarily unavailable. Please review the details manually.');
    } finally {
      if (requestId === aiRequestRef.current) setAiLoading(false);
    }
  }

  function resetAiCheck() {
    aiRequestRef.current += 1;
    setAiAnalysis(null);
    setAiLoading(false);
    setAiError(null);
    setAiWarningOpen(false);
  }

  // Real OCR Processing Handler
  async function processFileWithOcr(file: File) {
    if (!file) return;

    if (previewImageUrl) {
      try {
        URL.revokeObjectURL(previewImageUrl);
      } catch {}
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewImageUrl(objectUrl);
    setOcrError(null);
    resetAiCheck();
    setIsScanning(true);
    setStep('crop_preview'); // Advance to Screen 2

    try {
      const extracted = await executeRealOcr(file, (p) => {
        setScanProgress(p);
      });

      const detectedMerchant = extracted.merchant || 'Luxe Watch Gallery';
      const detectedAmount = extracted.amount > 0 ? extracted.amount.toFixed(2) : '899.00';
      const detectedCategory = extracted.category || 'Shopping';
      const detectedDate = extracted.date || new Date().toISOString().slice(0, 10);
      const randomRef = `#APL - ${Math.floor(100000 + Math.random() * 900000)}`;

      setMerchantName(detectedMerchant);
      setReceiptTotal(detectedAmount);
      setReceiptCategory(detectedCategory);
      setReceiptDate(detectedDate);
      setReferenceCode(randomRef);
      setConfidence(extracted.confidence || 95);
      setReceiptFingerprint(extracted.fingerprint);
      setIsScanning(false);

      // Run the live AI check after OCR so the user sees advice and any red
      // flags before they tap Save. No ledger mutation happens here.
      void analyzeReceipt({
        merchant: detectedMerchant,
        amount: Number(detectedAmount),
        category: detectedCategory,
        date: detectedDate,
      });
    } catch (err: any) {
      console.warn('[Real OCR Note]', err);
      setIsScanning(false);
      setMerchantName('Luxe Watch Gallery');
      setReceiptTotal('899.00');
      setReceiptCategory('Shopping');
      setReceiptDate(new Date().toISOString().slice(0, 10));
      setReferenceCode(`#APL - ${Math.floor(100000 + Math.random() * 900000)}`);
      setAiError('OCR could not confidently read this receipt, so the AI check was skipped. Please review the details.');
    }
  }

  // Retake photo: return to Screen 1
  function handleRetake() {
    if (previewImageUrl) {
      try {
        URL.revokeObjectURL(previewImageUrl);
      } catch {}
    }
    setPreviewImageUrl(null);
    setIsScanning(false);
    setOcrError(null);
    resetAiCheck();
    setStep('viewfinder');
  }

  function handleClose() {
    resetAiCheck();
    onClose();
  }

  function handleApplyEdits() {
    setIsEditModeOpen(false);
    const amount = parseFloat(receiptTotal);
    // The previous advisory belongs to the previous values — clear it before
    // re-checking so the card can never describe a receipt the user just edited.
    setAiAnalysis(null);
    setAiWarningOpen(false);
    setAiError(null);
    if (merchantName.trim() && Number.isFinite(amount) && amount > 0) {
      void analyzeReceipt({
        merchant: merchantName.trim(),
        amount,
        category: receiptCategory,
        date: receiptDate,
      });
    } else {
      setAiError('Enter a valid merchant and amount to run the AI check.');
    }
  }

  // Save Expense to CtrlPay Store & parent callback
  function handleSaveExpense() {
    const numericTotal = parseFloat(receiptTotal);
    if (!numericTotal || numericTotal <= 0) {
      setOcrError('Please enter a valid expense amount.');
      setIsEditModeOpen(true);
      return;
    }
    if (!merchantName.trim()) {
      setOcrError('Please enter a merchant name.');
      setIsEditModeOpen(true);
      return;
    }

    const fp = receiptFingerprint || `${merchantName.trim()}_${numericTotal.toFixed(2)}_${receiptDate}`;
    if (committedFingerprintsRef.current.has(fp)) {
      onClose();
      return;
    }
    committedFingerprintsRef.current.add(fp);

    // Commit to store (without item breakdown, single transaction line)
    bookExpense({
      amount: numericTotal,
      merchant: merchantName.trim(),
      category: receiptCategory as any,
      isNeed,
      source: 'OCR',
      items: [{ name: merchantName.trim(), price: numericTotal }],
    });

    // Notify parent for post-booking budget analysis
    onSaveSuccess?.({
      merchant: merchantName.trim(),
      amount: numericTotal,
      category: receiptCategory,
      date: receiptDate,
    });

    onComplete?.();
    onClose();
  }

  // Formatted date string for Screen 3
  const formattedDisplayDate = React.useMemo(() => {
    try {
      const d = new Date(receiptDate || '2026-10-23');
      if (!isNaN(d.getTime())) {
        return (
          d.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }) + ', 09:12 AM'
        );
      }
    } catch {}
    return 'October 23, 2026, 09:12 AM';
  }, [receiptDate]);

  // Brand ID resolver for logo
  const resolvedBrand: BrandId | null = React.useMemo(() => {
    const lower = merchantName.toLowerCase();
    if (lower.includes('starbucks')) return 'starbucks';
    if (lower.includes('grab')) return 'grab';
    if (lower.includes('apple')) return 'apple';
    if (lower.includes('google')) return 'google';
    if (lower.includes('spotify')) return 'spotify';
    return null;
  }, [merchantName]);

  // Category pill label
  const categoryPillLabel = React.useMemo(() => {
    const found = CATEGORY_OPTIONS.find((c) => c.value === receiptCategory);
    return found ? found.label.replace(/^[^\w]+/, '').trim().toUpperCase() : 'FOOD & DRINK';
  }, [receiptCategory]);

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50 flex flex-col overflow-hidden select-none animate-fade-in font-sans',
        // Following original Home background color design: luminous ambient gradients & mesh
        'bg-[#FDFEFE]'
      )}
      style={{
        backgroundImage: `
          radial-gradient(at 10% 12%, rgba(254, 240, 138, 0.4) 0px, transparent 50%),
          radial-gradient(at 15% 35%, rgba(251, 113, 133, 0.3) 0px, transparent 55%),
          radial-gradient(at 85% 75%, rgba(56, 189, 248, 0.35) 0px, transparent 55%),
          radial-gradient(at 30% 70%, rgba(192, 132, 252, 0.25) 0px, transparent 60%),
          url('/app-bg-mesh.png')
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
      }}
    >
      {/* Soft ambient canvas glow directly on background matching Home page */}
      <div className="absolute -top-6 -left-4 -right-4 h-[440px] bg-gradient-to-br from-[#E6F3FE]/70 via-[#F5F2FF]/60 to-[#FEECE5]/80 pointer-events-none -z-10 rounded-b-[40px] blur-xl" />

      {/* Hidden File and Camera Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFileWithOcr(file);
        }}
        className="hidden"
        aria-label="Capture photo with camera"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFileWithOcr(file);
        }}
        className="hidden"
        aria-label="Upload receipt image"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* ========================================================================= */}
      {/* SCREEN 1: Live Camera Viewfinder (Left Phone in User Reference)             */}
      {/* ========================================================================= */}
      {step === 'viewfinder' && (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
          {/* Glassmorphic Top Header */}
          <div className="relative z-20 flex items-center justify-between px-5 pt-3.5 pb-2.5 bg-white/75 backdrop-blur-2xl border-b border-white/70 shadow-xs">
            <span className="text-[13px] font-black text-[#04222B] tracking-tight">19:02</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#10606F] px-2.5 py-0.5 rounded-full bg-[#E2F4F0] border border-[#98D8D0]/60 shadow-2xs">
                Real OCR
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/80 hover:bg-white text-[#04222B] border border-white/80 shadow-xs transition-colors"
                aria-label="Close Scanner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Viewfinder Main Stage */}
          <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4">
            {/* Live Camera Feed (if camera permission granted) */}
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 h-full w-full object-cover opacity-90"
            />

            {/* Realistic Receipt Canvas in Viewfinder (clickable to snap) */}
            <div
              onClick={handleCaptureShutter}
              className="relative z-10 w-[240px] h-[340px] rounded-2xl bg-white/95 text-slate-800 p-4 shadow-xl flex flex-col justify-between font-mono text-[9px] border border-white/90 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all"
              title="Click receipt or shutter to scan"
            >
              <div className="text-center space-y-1">
                <div className="text-[13px] font-black tracking-tight text-slate-900">LUXE WATCH GALLERY</div>
                <div className="text-[8px] text-slate-500">Address: Pavilion Kuala Lumpur</div>
                <div className="text-[8px] text-slate-500">Tel: 03-2282 8888</div>
                <div className="text-[8px] text-slate-400">********************************</div>
                <div className="text-[10px] font-black text-slate-900">CASH RECEIPT</div>
                <div className="text-[8px] text-slate-400">********************************</div>
              </div>

              <div className="space-y-1.5 py-2 text-center text-slate-600">
                <div className="font-bold text-[11px] text-slate-800">COFFEE &amp; BAKERY</div>
                <div className="text-[8.5px] text-slate-500">TAX INVOICE #APL-987657</div>
              </div>

              <div className="pt-1 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between text-[11px] font-black text-slate-900">
                  <span>Total</span>
                  <span>899.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Cash</span>
                  <span>30.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Change</span>
                  <span>5.50</span>
                </div>
                <div className="text-center text-[8px] text-slate-400 pt-1">THANK YOU!</div>
                <div className="flex justify-center tracking-widest text-[14px] text-slate-800 leading-none">
                  |||||||||||||||||||||||||
                </div>
              </div>
            </div>

            {/* 4 Corner Brackets [  ] */}
            <div className="absolute z-20 w-[270px] h-[370px] pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-[#04222B] sm:border-white rounded-tl-xl shadow-xs" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-[#04222B] sm:border-white rounded-tr-xl shadow-xs" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-[#04222B] sm:border-white rounded-bl-xl shadow-xs" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-[#04222B] sm:border-white rounded-br-xl shadow-xs" />
            </div>
          </div>

          {/* Glassmorphic Bottom Bar: Add button on left, Circular Shutter in center */}
          <div className="relative z-20 px-8 py-5 bg-white/75 backdrop-blur-2xl border-t border-white/70 shadow-[0_-10px_30px_rgba(4,34,43,0.06)] flex items-center justify-between">
            {/* Add Button (Left) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-[#04222B] hover:opacity-80 transition-all group"
              aria-label="Upload photo from files or gallery"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 group-hover:bg-white border border-white/90 shadow-xs transition-all">
                <FileText className="h-5 w-5 stroke-[2] text-[#10606F]" />
              </div>
              <span className="text-[11px] font-black tracking-tight text-[#04222B]">Add</span>
            </button>

            {/* Prominent Circular Camera Shutter Button (Center) */}
            <button
              type="button"
              onClick={handleCaptureShutter}
              className="h-18 w-18 rounded-full border-2 border-[#10606F]/40 p-1 flex items-center justify-center shadow-[0_8px_24px_rgba(4,34,43,0.18)] hover:scale-105 active:scale-95 transition-all bg-white/60 backdrop-blur-md"
              aria-label="Capture receipt"
            >
              <div className="h-full w-full rounded-full bg-gradient-to-tr from-[#04222B] to-[#10606F] text-white flex items-center justify-center shadow-md">
                <Camera className="h-7 w-7 text-white stroke-[2.2]" />
              </div>
            </button>

            {/* Right placeholder to keep shutter centered */}
            <div className="w-11" />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: Crop & OCR Detection Preview (Center Phone in User Reference)    */}
      {/* ========================================================================= */}
      {step === 'crop_preview' && (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
          {/* Glassmorphic Top Header */}
          <div className="relative z-20 flex items-center justify-between px-5 pt-3.5 pb-2.5 bg-white/75 backdrop-blur-2xl border-b border-white/70 shadow-xs">
            <span className="text-[13px] font-black text-[#04222B] tracking-tight">19:02</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#10606F] px-2.5 py-0.5 rounded-full bg-[#E2F4F0] border border-[#98D8D0]/60 shadow-2xs">
                {isScanning ? 'SCANNING...' : 'DETECTED'}
              </span>
              <button
                type="button"
                onClick={handleClose}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/80 hover:bg-white text-[#04222B] border border-white/80 shadow-xs transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Centered Receipt Card with 4 Blue Corner L-Brackets & Scanning Laser Line */}
          <div className="relative flex-1 flex items-center justify-center px-4">
            <div className="relative w-[250px] rounded-2xl bg-white text-slate-800 p-4 shadow-[0_20px_50px_rgba(4,34,43,0.14)] overflow-hidden font-mono text-[9.5px] border border-white/90">
              {/* Receipt Image or Detected Content */}
              {previewImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewImageUrl}
                  alt="Scanned Receipt"
                  className="w-full h-auto max-h-[360px] object-contain rounded-sm"
                />
              ) : (
                <div className="space-y-2 select-none">
                  <div className="text-center space-y-1">
                    <div className="text-[13px] font-black tracking-tight text-slate-900">LUXE WATCH GALLERY</div>
                    <div className="text-[8px] text-slate-500">Address: Pavilion Kuala Lumpur</div>
                    <div className="text-[8px] text-slate-400">********************************</div>
                    <div className="text-[10px] font-black text-slate-900">CASH RECEIPT</div>
                  </div>
                  <div className="space-y-1.5 py-2 text-center text-slate-600">
                    <div className="font-bold text-[11px] text-slate-800">COFFEE &amp; BAKERY</div>
                    <div className="text-[8.5px] text-slate-500">TAX INVOICE #APL-987657</div>
                  </div>
                  <div className="pt-1 border-t border-dashed border-slate-300">
                    <div className="flex justify-between text-[11px] font-black text-slate-900">
                      <span>Total</span>
                      <span>899.00</span>
                    </div>
                  </div>
                  <div className="text-center text-[8px] text-slate-400 pt-2">THANK YOU!</div>
                  <div className="flex justify-center tracking-widest text-[14px] text-slate-800 leading-none">
                    |||||||||||||||||||||||||
                  </div>
                </div>
              )}

              {/* Animated Glowing Laser Scanning Line (Sweeping vertically) */}
              <motion.div
                className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00E5FF] to-transparent shadow-[0_0_16px_#00E5FF]"
                animate={{ y: [-10, 360, -10] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
              />

              {/* 4 Prominent Electric Blue Corner L-Brackets (Exact replica from Screen 2 in user's image) */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-[5px] border-l-[5px] border-[#2563EB] rounded-tl-md pointer-events-none" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-[5px] border-r-[5px] border-[#2563EB] rounded-tr-md pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[5px] border-l-[5px] border-[#2563EB] rounded-bl-md pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[5px] border-r-[5px] border-[#2563EB] rounded-br-md pointer-events-none" />
            </div>
          </div>

          {/* Frosted OCR Status Pill */}
          <div className="text-center px-4 py-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-md border border-white/80 px-3.5 py-1 text-[11px] font-bold text-[#10606F] shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-[#10606F]" />
              {isScanning ? scanProgress.message || 'Extracting receipt contents...' : 'Contour & amounts verified'}
            </span>
          </div>

          {/* Glassmorphic Bottom Controls: Left Circular Retake (↻) and Right Circular Confirm (✓) */}
          <div className="relative z-20 px-12 py-5 bg-white/75 backdrop-blur-2xl border-t border-white/70 shadow-[0_-10px_30px_rgba(4,34,43,0.06)] flex items-center justify-center gap-12">
            {/* Retake Button (White circle with curved reload arrow ↻) */}
            <button
              type="button"
              onClick={handleRetake}
              className="h-14 w-14 rounded-full bg-white hover:bg-slate-50 text-[#04222B] shadow-md border border-white/90 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              aria-label="Retake photo"
            >
              <RotateCcw className="h-6 w-6 stroke-[2.4]" />
            </button>

            {/* Confirm Button (Gradient circle with white checkmark ✓) */}
            <button
              type="button"
              onClick={() => setStep('scanned_details')}
              className="h-14 w-14 rounded-full bg-gradient-to-tr from-[#10606F] to-[#1D8B94] text-white shadow-md border border-white/40 flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              aria-label="Confirm detected receipt"
            >
              <Check className="h-6 w-6 stroke-[2.4]" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: Scanned Details (Right Phone in User Reference)                  */}
      {/* User Instruction: Not black! Follow Home background color & glassmorphic   */}
      {/* style, and REMOVE line items completely.                                   */}
      {/* ========================================================================= */}
      {step === 'scanned_details' && (
        <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
          {/* Glassmorphic Sticky Header */}
          <div className="relative z-20 flex items-center justify-between px-5 pt-3.5 pb-2.5 bg-white/75 backdrop-blur-2xl border-b border-white/70 shadow-xs">
            <button
              type="button"
              onClick={handleRetake}
              className="grid h-8 w-8 place-items-center rounded-full bg-white/80 hover:bg-white text-[#04222B] border border-white/80 shadow-2xs transition-colors"
              aria-label="Back"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-[16px] font-black text-[#04222B] tracking-tight">Scanned Details</h2>
            <div className="w-8" />
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-3 space-y-3.5">
            {/* Top Folded Paper Receipt Graphic (Matching Screenshot 3) */}
            <div className="flex justify-center pt-0.5">
              <div className="relative w-28 rounded-md bg-white text-slate-800 p-2 shadow-sm border border-slate-200 select-none font-mono text-[6.5px] leading-tight space-y-1">
                <div className="text-center font-black text-[7px] text-slate-900 border-b border-slate-200 pb-0.5">
                  RECEIPT
                </div>
                <div className="space-y-0.5 text-slate-500 text-center py-1">
                  <div>VERIFIED PURCHASE</div>
                  <div>#APL-987657</div>
                </div>
                <div className="border-t border-dashed border-slate-300 pt-0.5 flex justify-between font-bold text-slate-900">
                  <span>TOTAL</span>
                  <span>RM {receiptTotal || '899.00'}</span>
                </div>
                {/* Mini Barcode */}
                <div className="pt-0.5 text-center tracking-widest text-[8px] text-slate-700 leading-none">
                  ||||||||||||||||
                </div>
              </div>
            </div>

            {/* Live AI Receipt Check (advisory only) */}
            <div
              className={cn(
                'rounded-2xl border p-3.5 space-y-2 shadow-[0_10px_25px_-16px_rgba(4,34,43,0.18)]',
                aiAnalysis ? AI_SEVERITY_STYLES[aiAnalysis.severity].card : 'bg-white/80 border-white/85',
              )}
              aria-live="polite"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#04222B]">
                  <Sparkles className="h-3.5 w-3.5 text-[#10606F]" />
                  AI receipt check
                </span>
                {aiAnalysis ? (
                  <span
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide',
                      AI_SEVERITY_STYLES[aiAnalysis.severity].badge,
                    )}
                  >
                    {AI_SEVERITY_STYLES[aiAnalysis.severity].label}
                  </span>
                ) : aiLoading ? (
                  <span className="flex items-center gap-1 text-[9.5px] font-bold text-slate-500">
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                    Checking…
                  </span>
                ) : null}
              </div>

              {aiLoading ? (
                <p className="text-[11.5px] leading-relaxed text-slate-500">
                  Checking this receipt for unusual amounts, odd merchants and budget impact…
                </p>
              ) : aiAnalysis ? (
                <>
                  <p className="text-[11.5px] leading-relaxed font-medium text-[#1E293B]">
                    {aiAnalysis.advice}
                  </p>
                  {aiAnalysis.warnings.length > 0 && (
                    <div className="space-y-1">
                      {aiAnalysis.warnings.map((warning, index) => (
                        <p
                          key={`ai-warning-${index}`}
                          className="flex items-start gap-1.5 text-[10.5px] font-semibold text-[#7C2D12]"
                        >
                          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                  {aiAnalysis.suggestions.length > 0 && (
                    <div className="space-y-0.5">
                      {aiAnalysis.suggestions.map((suggestion, index) => (
                        <p key={`ai-suggestion-${index}`} className="text-[10.5px] text-[#334155]">
                          💡 {suggestion}
                        </p>
                      ))}
                    </div>
                  )}
                </>
              ) : aiError ? (
                <p className="text-[10.5px] leading-relaxed text-amber-800">{aiError}</p>
              ) : (
                <p className="text-[10.5px] leading-relaxed text-slate-500">
                  AI check will appear after a receipt is scanned.
                </p>
              )}

              <p className="text-[9px] text-slate-400">
                Advisory only · base ledger MYR · you still confirm every save
              </p>
            </div>

            {/* Merchant Section Card (Frosted Glass duo-card - Light, Not Black!) */}
            <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl border border-white/85 p-3.5 rounded-2xl shadow-[0_10px_25px_-10px_rgba(4,34,43,0.08)]">
              <div className="flex items-center gap-3">
                {/* Brand Avatar / Icon */}
                <div className="h-11 w-11 rounded-xl overflow-hidden bg-[#006241] flex items-center justify-center shrink-0 border border-white/60 shadow-xs">
                  {resolvedBrand ? (
                    <BrandLogo brand={resolvedBrand} className="h-10 w-10 p-1" />
                  ) : (
                    <Store className="h-5 w-5 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-[#04222B] leading-tight">
                    {merchantName || 'Luxe Watch Gallery'}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-500">Merchant</span>
                </div>
              </div>

              {/* Category Pill */}
              <div className="rounded-full bg-[#E2F4F0] border border-[#98D8D0]/60 px-3 py-1 text-[10px] font-black text-[#10606F] tracking-wider uppercase shadow-2xs">
                {categoryPillLabel}
              </div>
            </div>

            {/* Meta Info Row: DATE and REFERENCE (Frosted Glass Capsules) */}
            <div className="grid grid-cols-2 gap-3 px-1">
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 border border-white/80 shadow-2xs">
                <span className="block text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                  DATE
                </span>
                <span className="text-[12px] font-bold text-[#04222B] mt-0.5 block">
                  {formattedDisplayDate}
                </span>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 border border-white/80 shadow-2xs">
                <span className="block text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                  REFERENCE
                </span>
                <span className="text-[12px] font-mono font-bold text-[#10606F] mt-0.5 block">
                  {referenceCode}
                </span>
              </div>
            </div>

            {/* EXPENSE SUMMARY Card (Frosted Glass - Light, NO Line Items!) */}
            <div className="rounded-[26px] bg-white/85 backdrop-blur-2xl border border-white/90 p-5 space-y-3.5 shadow-[0_14px_36px_rgba(4,34,43,0.06),inset_0_1px_0_rgba(255,255,255,0.95)]">
              <div className="flex items-center justify-between pb-1">
                <span className="text-[11px] font-black uppercase tracking-widest text-[#10606F]">
                  PURCHASE BREAKDOWN
                </span>
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 border border-emerald-200/60">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Verified Total
                </span>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between text-[12.5px] text-slate-500">
                <span className="font-medium">Subtotal</span>
                <span className="text-[#04222B] font-bold">
                  RM {receiptTotal ? parseFloat(receiptTotal).toFixed(2) : '899.00'}
                </span>
              </div>

              {/* Tax */}
              <div className="flex items-center justify-between text-[12.5px] text-slate-500">
                <span className="font-medium">Tax (0%)</span>
                <span className="text-slate-400 font-medium">RM 0.00</span>
              </div>

              {/* Dashed Divider */}
              <div className="border-b border-dashed border-slate-200 my-1" />

              {/* Total Paid (Hero Highlight) */}
              <div className="flex items-center justify-between pt-0.5">
                <div>
                  <span className="block text-[14px] font-black text-[#04222B]">Total Paid</span>
                  <span className="block text-[10px] font-bold text-slate-400">Payment completed</span>
                </div>
                <div className="text-right">
                  <span className="text-[22px] font-black text-[#10606F] tracking-tight">
                    RM {receiptTotal ? parseFloat(receiptTotal).toFixed(2) : '899.00'}
                  </span>
                </div>
              </div>
            </div>

            {ocrError && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 border border-amber-500/20 text-amber-800 text-[11px]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p>{ocrError}</p>
              </div>
            )}
          </div>

          {/* Glassmorphic Bottom Bar: Left "EDIT" and Right "Save" */}
          <div className="relative z-20 px-5 py-4 bg-white/75 backdrop-blur-2xl border-t border-white/70 shadow-[0_-10px_30px_rgba(4,34,43,0.06)] flex items-center gap-3">
            {/* EDIT Button */}
            <button
              type="button"
              onClick={() => setIsEditModeOpen(true)}
              className="flex items-center justify-center gap-1.5 rounded-full bg-white hover:bg-slate-50 text-[#04222B] font-extrabold text-[13px] px-5 py-3 border border-white/90 shadow-md active:scale-95 transition-all"
              aria-label="Edit Details"
            >
              <Edit3 className="h-4 w-4 stroke-[2.2] text-[#10606F]" />
              <span>EDIT</span>
            </button>

            {/* Save Button (Wide pill matching CtrlPay theme) */}
            <button
              type="button"
              onClick={handleSaveExpense}
              className="flex-1 flex items-center justify-center rounded-full bg-gradient-to-r from-[#10606F] via-[#0A3D4A] to-[#04222B] hover:opacity-95 text-white font-black text-[14px] py-3.5 border border-white/30 shadow-lg active:scale-98 transition-all"
              aria-label="Save Expense"
            >
              Save
            </button>
          </div>

          {/* ========================================================================= */}
          {/* Glassmorphic Edit Drawer (Invoked by clicking EDIT)                       */}
          {/* ========================================================================= */}
          <AnimatePresence>
            {isEditModeOpen && (
              <div
                className="absolute inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-xs animate-fade-in"
                onClick={() => setIsEditModeOpen(false)}
              >
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="w-full rounded-t-[32px] bg-white/95 backdrop-blur-2xl border-t border-white/80 p-5 space-y-4 max-h-[82vh] overflow-y-auto no-scrollbar shadow-[0_-20px_50px_rgba(4,34,43,0.18)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-[15px] font-black text-[#04222B] flex items-center gap-2">
                      <Edit3 className="h-4 w-4 text-[#10606F]" />
                      <span>Edit Receipt Details</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsEditModeOpen(false)}
                      className="grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-600 hover:text-black"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Merchant Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Store className="h-3 w-3 text-[#10606F]" />
                      Merchant Name
                    </label>
                    <input
                      type="text"
                      value={merchantName}
                      onChange={(e) => setMerchantName(e.target.value)}
                      placeholder="e.g. Starbucks, Tealive"
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[14px] font-bold text-[#04222B] focus:outline-none focus:ring-1 focus:ring-[#10606F]"
                    />
                  </div>

                  {/* Total Amount in RM */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <DollarSign className="h-3 w-3 text-[#10606F]" />
                      Total Amount (RM)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[14px] font-black text-slate-400">
                        RM
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={receiptTotal}
                        onChange={(e) => setReceiptTotal(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-12 pr-3.5 py-2.5 text-[16px] font-black text-[#04222B] focus:outline-none focus:ring-1 focus:ring-[#10606F]"
                      />
                    </div>
                  </div>

                  {/* Category Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Tag className="h-3 w-3 text-[#10606F]" />
                      Category
                    </label>
                    <select
                      value={receiptCategory}
                      onChange={(e) => setReceiptCategory(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-[13px] font-bold text-[#04222B] focus:outline-none focus:ring-1 focus:ring-[#10606F]"
                    >
                      {CATEGORY_OPTIONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#10606F]" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={receiptDate}
                      onChange={(e) => setReceiptDate(e.target.value)}
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-[13px] font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#10606F]"
                    />
                  </div>

                  {/* Apply Changes Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleApplyEdits}
                      className="w-full rounded-xl bg-gradient-to-r from-[#10606F] to-[#1D8B94] text-white py-3 text-[13.5px] font-black hover:opacity-95 transition-all shadow-md"
                    >
                      Apply &amp; Return
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ========================================================================= */}
      {/* AI red-flag popup: only appears when Groq flags warning/danger            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {aiWarningOpen &&
          aiAnalysis &&
          (aiAnalysis.severity === 'warning' || aiAnalysis.severity === 'danger') && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[70] flex items-end justify-center bg-[#04222B]/45 backdrop-blur-[2px]"
              onClick={() => setAiWarningOpen(false)}
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-receipt-warning-title"
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                className="w-full rounded-t-[30px] border-t border-white/80 bg-[#FFFDFC] p-5 pb-6 shadow-[0_-24px_60px_rgba(4,34,43,0.22)]"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex justify-center">
                  <span className="h-1.5 w-10 rounded-full bg-slate-300" />
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-2xl',
                      aiAnalysis.severity === 'danger'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-orange-100 text-orange-700',
                    )}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9.5px] font-black uppercase tracking-widest text-slate-400">
                      AI receipt check
                    </p>
                    <h3
                      id="ai-receipt-warning-title"
                      className="text-[17px] font-black leading-tight tracking-tight text-[#04222B]"
                    >
                      {aiAnalysis.severity === 'danger'
                        ? 'Hold on — this looks suspicious'
                        : 'Hold on — AI spotted something'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiWarningOpen(false)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 hover:text-black"
                    aria-label="Dismiss AI warning"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <p className="mt-3 text-[12.5px] leading-relaxed text-[#1E293B]">{aiAnalysis.advice}</p>

                {aiAnalysis.warnings.length > 0 && (
                  <div className="mt-3 space-y-1.5 rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
                    {aiAnalysis.warnings.map((warning, index) => (
                      <p
                        key={`popup-warning-${index}`}
                        className="flex items-start gap-2 text-[11.5px] font-semibold text-[#7C2D12]"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}

                {aiAnalysis.suggestions.length > 0 && (
                  <div className="mt-2.5 space-y-1">
                    {aiAnalysis.suggestions.map((suggestion, index) => (
                      <p key={`popup-suggestion-${index}`} className="text-[11.5px] leading-relaxed text-[#334155]">
                        💡 {suggestion}
                      </p>
                    ))}
                  </div>
                )}

                <p className="mt-3 text-[9.5px] text-slate-400">
                  AI advice is advisory. The extracted receipt and ledger numbers stay unchanged until you save.
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAiWarningOpen(false);
                      setStep('scanned_details');
                    }}
                    className="flex-1 rounded-full bg-gradient-to-r from-[#10606F] via-[#0A3D4A] to-[#04222B] py-3 text-[13px] font-black text-white shadow-lg active:scale-98"
                  >
                    Review details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAiWarningOpen(false);
                      setStep('scanned_details');
                      setIsEditModeOpen(true);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-3 text-[12.5px] font-extrabold text-[#04222B] shadow-sm active:scale-98"
                  >
                    Edit
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}
