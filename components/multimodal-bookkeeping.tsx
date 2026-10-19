'use client';

import * as React from 'react';
import { Camera, Check, Keyboard, Mic, MicOff, ScanLine, ShieldAlert, Sparkles, Trash2, X } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';
import { toISODate, formatRM } from '@/lib/utils';
import { BOOKING_CATEGORIES, parseBookingText, type BookingDraft } from '@/lib/bookkeeping';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ *
 * Minimal Web Speech API typings (browser-only, optional feature).
 * ------------------------------------------------------------------ */
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

type Mode = 'RECEIPT' | 'VOICE' | 'CHAT';

/**
 * P2 Multimodal Bookkeeping (plan.md Section 5.5).
 *
 * Receipt image, voice transcript and typed text all converge on ONE editable draft.
 * Nothing is booked until the user clicks Confirm. The receipt image is previewed from
 * a local object URL and is NEVER uploaded or persisted; it is discarded on confirm.
 *
 * `defaultMode` lets the AI orb deep-link straight into the OCR view (short tap) or the
 * voice view (long press).
 */
export function MultimodalBookkeeping({
  defaultOpen = false,
  defaultMode = 'CHAT',
  autoStartVoice = false,
  onOpenReceiptFlow,
  onBooked,
}: {
  defaultOpen?: boolean;
  defaultMode?: Mode;
  autoStartVoice?: boolean;
  onOpenReceiptFlow?: () => void;
  onBooked?: (data: { merchant: string; amount: number; category: string }) => void;
}) {
  const bookExpense = useCtrlPayStore((s) => s.bookExpense);
  const sandboxClock = useCtrlPayStore((s) => s.sandboxClock);

  const [open, setOpen] = React.useState(defaultOpen);
  const [mode, setMode] = React.useState<Mode>(defaultMode);
  const [draft, setDraft] = React.useState<BookingDraft | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [chatText, setChatText] = React.useState('');
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [listening, setListening] = React.useState(false);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const voiceSupported = React.useMemo(() => getSpeechRecognition() !== null, []);

  const todayISO = toISODate(sandboxClock);

  const clearPreview = React.useCallback(() => {
    setPreviewUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
  }, []);

  // Drop the local image reference on unmount — nothing is ever persisted.
  React.useEffect(() => clearPreview, [clearPreview]);

  // The AI orb's long-press opens straight into a live voice session.
  const autoStarted = React.useRef(false);
  React.useEffect(() => {
    if (autoStartVoice && defaultMode === 'VOICE' && !autoStarted.current) {
      autoStarted.current = true;
      startVoice();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetDraft() {
    setDraft(null);
    clearPreview();
  }

  function draftFromText(text: string, source: 'VOICE' | 'CHAT') {
    setError(null);
    setNotice(null);
    const parsed = parseBookingText(text, { todayISO, source });
    if (!parsed) {
      setError('I could not find an amount in that. Try: "I spent RM 12 on lunch".');
      return;
    }
    setDraft(parsed);
  }

  async function handleReceiptFile(file: File | undefined) {
    if (!file) return;
    clearPreview();
    setError(null);
    setNotice(null);
    setPreviewUrl(URL.createObjectURL(file));
    setNotice('Analyzing receipt image with OCR in secure memory...');

    try {
      const { executeRealOcr } = await import('@/lib/real-ocr');
      const res = await executeRealOcr(file);
      setNotice(null);
      setDraft({
        merchant: res.merchant,
        amountRM: res.amount,
        category: res.spendCategory,
        isNeed: res.isNeed,
        date: todayISO,
        source: 'RECEIPT',
        rawText: `OCR real extract · ${res.merchant} RM ${res.amount.toFixed(2)}`,
        confidence: res.confidence / 100,
      });
    } catch {
      setNotice(null);
      setError('Could not extract text from this receipt. Try another photo or enter manually.');
    }
  }

  function startVoice() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError('Voice input is not supported in this browser. Type the amount instead.');
      return;
    }
    setError(null);
    setNotice(null);
    const rec = new Ctor();
    recognitionRef.current = rec;
    rec.lang = 'en-MY';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setChatText(transcript);
      draftFromText(transcript, 'VOICE');
    };
    rec.onerror = () => setError('Speech recognition failed. You can type the amount instead.');
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  function stopVoice() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  function confirmBooking() {
    if (!draft) return;
    bookExpense({
      merchant: draft.merchant,
      amount: draft.amountRM,
      category: draft.category,
      isNeed: draft.isNeed,
      source: draft.source,
    });
    const bookedData = {
      merchant: draft.merchant,
      amount: draft.amountRM,
      category: draft.category.replaceAll('_', ' '),
    };
    onBooked?.(bookedData);
    setNotice(`Booked ${formatRM(draft.amountRM)} at ${draft.merchant}. The receipt image was discarded.`);
    setChatText('');
    resetDraft();
  }

  return (
    <div className="ct-panel overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span className="ct-well h-8 w-8 rounded-xl">
            <Camera className="h-4 w-4 text-holst-800" />
          </span>
          <span>
            <span className="block text-[12.5px] font-bold text-holst-950">Multimodal bookkeeping</span>
            <span className="duo-muted block text-[10.5px]">Receipt · voice · text → one draft</span>
          </span>
        </span>
        <span className="ct-chip">{open ? 'Hide' : 'Add expense'}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-holst-950/5 px-4 pb-4 pt-3">
          <div className="ct-seg">
            <button type="button" data-on={mode === 'CHAT'} className="ct-seg-btn" onClick={() => setMode('CHAT')}>
              <Keyboard className="h-3 w-3" /> Type
            </button>
            <button
              type="button"
              data-on={mode === 'RECEIPT'}
              className="ct-seg-btn"
              onClick={() => setMode('RECEIPT')}
            >
              <Camera className="h-3 w-3" /> Receipt
            </button>
            <button type="button" data-on={mode === 'VOICE'} className="ct-seg-btn" onClick={() => setMode('VOICE')}>
              <Mic className="h-3 w-3" /> Voice
            </button>
          </div>

          {mode === 'CHAT' && (
            <div className="flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder='e.g. "I spent RM 12 on lunch"'
                className="min-w-0 flex-1 rounded-xl border border-holst-950/10 bg-white px-3 py-2 text-sm text-holst-950 outline-none focus:border-holst-600"
                aria-label="Expense text"
              />
              <Button size="sm" onClick={() => draftFromText(chatText, 'CHAT')}>
                Parse
              </Button>
            </div>
          )}

          {mode === 'RECEIPT' && (
            <div className="space-y-2.5">
              <label className="flex cursor-pointer flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-holst-600/50 bg-holst-50 py-3.5 text-[12.5px] font-bold text-holst-800 hover:bg-holst-100 transition-colors">
                <ScanLine className="h-4 w-4 text-[#10606F]" /> Tap camera / upload real receipt
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleReceiptFile(e.target.files?.[0])}
                  className="sr-only"
                  aria-label="Receipt image"
                />
              </label>

              {onOpenReceiptFlow && (
                <button
                  type="button"
                  onClick={onOpenReceiptFlow}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-[#10606F]/10 to-[#1D8B94]/15 hover:from-[#10606F]/20 hover:to-[#1D8B94]/25 text-[#10606F] text-[11.5px] font-bold border border-[#10606F]/20 transition-all shadow-2xs"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#1D8B94]" /> Open Fullscreen Receipt Scanner →
                </button>
              )}

              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Receipt preview (kept in memory only)"
                  className="max-h-36 rounded-2xl border border-holst-950/10"
                />
              )}
              <p className="flex items-start gap-1 text-[11px] leading-relaxed duo-muted">
                <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  <span className="font-semibold text-holst-800">
                    Raw image discarded immediately in memory, never written to disk.
                  </span>{' '}
                  Sandbox stand-in for a vision-LLM call: fields are extracted, then you confirm before anything is
                  booked.
                </span>
              </p>
            </div>
          )}

          {mode === 'VOICE' && (
            <div className="space-y-2">
              <Button
                size="sm"
                variant={listening ? 'destructive' : 'default'}
                onClick={listening ? stopVoice : startVoice}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {listening ? 'Stop' : 'Hold to talk'}
              </Button>
              {!voiceSupported && (
                <p className="text-[11px] duo-muted">Web Speech API not available here — type the amount instead.</p>
              )}
              <p className="text-[11px] leading-relaxed duo-muted">
                Browser speech recognition may process your audio in the cloud. The transcript still goes through
                confirm-before-book.
              </p>
            </div>
          )}

          {error && <p className="rounded-2xl bg-[#FDE7EC] p-2.5 text-xs text-[#B3253F]">{error}</p>}
          {notice && <p className="duo-safe p-2.5 text-xs">{notice}</p>}

          {draft && (
            <div className="space-y-3 rounded-2xl border border-holst-950/10 bg-white p-3">
              <p className="flex items-center gap-2 text-xs font-bold text-holst-950">
                Confirm the extracted fields <Badge variant="info">{draft.source}</Badge>
                <span className="duo-muted font-medium">confidence {Math.round(draft.confidence * 100)}%</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11px] duo-muted">
                  Merchant
                  <input
                    value={draft.merchant}
                    onChange={(e) => setDraft({ ...draft, merchant: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-holst-950/10 bg-white px-2 py-1.5 text-sm text-holst-950 outline-none focus:border-holst-600"
                  />
                </label>
                <label className="text-[11px] duo-muted">
                  Amount (RM)
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={draft.amountRM}
                    onChange={(e) => setDraft({ ...draft, amountRM: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-holst-950/10 bg-white px-2 py-1.5 text-sm text-holst-950 outline-none focus:border-holst-600"
                  />
                </label>
                <label className="text-[11px] duo-muted">
                  Date
                  <input
                    type="date"
                    value={draft.date}
                    onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-holst-950/10 bg-white px-2 py-1.5 text-sm text-holst-950 outline-none focus:border-holst-600"
                  />
                </label>
                <label className="text-[11px] duo-muted">
                  Category
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value as BookingDraft['category'] })}
                    className="mt-1 w-full rounded-xl border border-holst-950/10 bg-white px-2 py-1.5 text-sm text-holst-950 outline-none focus:border-holst-600"
                  >
                    {BOOKING_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replaceAll('_', ' ')}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-holst-950">
                <input
                  type="checkbox"
                  checked={draft.isNeed}
                  onChange={(e) => setDraft({ ...draft, isNeed: e.target.checked })}
                  className="accent-[#10606F]"
                />
                This is a NEED (protected from Escrow)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={confirmBooking} disabled={!draft.merchant || !(draft.amountRM > 0)}>
                  <Check className="h-4 w-4" /> Confirm &amp; book
                </Button>
                <Button size="sm" variant="ghost" onClick={resetDraft}>
                  <X className="h-4 w-4" /> Discard
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetDraft}
                  aria-label="Clear draft"
                  className="duo-muted"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
