'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Check } from 'lucide-react';
import { useCtrlPayStore } from '@/lib/store';

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" {...props}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}

export interface SignInViewProps {
  onSuccess?: () => void;
}

export function SignInView({ onSuccess }: SignInViewProps) {
  const [mode, setMode] = React.useState<'signup' | 'signin'>('signup');
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const loginAsUser = useCtrlPayStore((s) => s.loginAsUser);
  const loginAsDemo = useCtrlPayStore((s) => s.loginAsDemo);

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      loginAsUser({
        fullName: fullName.trim() || 'Mary Olhson',
        email: email.trim() || 'mary.olhson@gmail.com',
      });
      setIsLoading(false);
      onSuccess?.();
    }, 350);
  };

  const handleGoogleSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      loginAsUser({
        fullName: fullName.trim() || 'Mary Olhson',
        email: email.trim() || 'mary.olhson@gmail.com',
      });
      setIsLoading(false);
      onSuccess?.();
    }, 350);
  };

  const handleDemoSignIn = () => {
    setIsLoading(true);
    setTimeout(() => {
      loginAsDemo();
      setIsLoading(false);
      onSuccess?.();
    }, 350);
  };

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center py-4 px-3 sm:px-4 overflow-y-auto no-scrollbar font-sans select-none">
      {/* Soft ambient canvas glow directly on background matching main page */}
      <div className="absolute -top-6 -left-4 -right-4 h-[440px] bg-gradient-to-br from-[#E6F3FE]/70 via-[#F5F2FF]/60 to-[#FEECE5]/80 pointer-events-none -z-10 rounded-b-[40px] blur-xl" />

      {/* Centered White Card (Pixel-accurate to reference image, matching mainpage frosted cards) */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[364px] rounded-[24px] bg-white/90 backdrop-blur-[24px] px-5 py-6 sm:px-6 sm:py-6 shadow-[0_20px_44px_-8px_rgba(4,34,43,0.06),0_2px_12px_rgba(4,34,43,0.03)] border border-white/90 my-auto"
      >
        {/* Card Header Title */}
        <h1 className="text-center font-serif text-[23px] font-bold text-[#1E293B] tracking-tight mb-5">
          {mode === 'signup' ? 'Sign up for free' : 'Sign in to CtrlPay'}
        </h1>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="relative w-full h-[48px] rounded-xl bg-[#5B89EE] hover:bg-[#4C7BE1] active:scale-[0.99] transition-all flex items-center px-1.5 shadow-[0_4px_16px_rgba(91,137,238,0.32)] cursor-pointer group"
        >
          {/* White square icon box */}
          <div className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-xs ml-1">
            <GoogleIcon className="h-4.5 w-4.5" />
          </div>

          {/* Button Label */}
          <span className="flex-1 text-center text-white font-medium text-[13.5px] pr-8">
            {mode === 'signup' ? 'Sign up with Google' : 'Sign in with Google'}
          </span>
        </button>

        {/* Divider: OR SIGN UP WITH EMAIL */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="w-full border-t border-[#E2E8F0]" />
          <span className="absolute bg-white px-2.5 text-[10px] font-bold text-[#94A3B8] tracking-[0.14em] uppercase whitespace-nowrap">
            {mode === 'signup' ? 'OR SIGN UP WITH EMAIL' : 'OR SIGN IN WITH EMAIL'}
          </span>
        </div>

        {/* Email Form */}
        <form onSubmit={handleUserSubmit} className="space-y-3.5">
          {/* Full Name Field (shown in signup mode) */}
          {mode === 'signup' && (
            <div>
              <label
                htmlFor="full-name"
                className="block text-[12.5px] font-bold text-[#1E293B] mb-1 font-serif"
              >
                Full Name
              </label>
              <input
                id="full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Eg. Mary Olhson"
                className="w-full h-[42px] px-3.5 rounded-lg border border-[#E2E8F0] bg-white text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8]/90 focus:border-[#5B89EE] focus:ring-3 focus:ring-[#5B89EE]/15 outline-none transition-all"
              />
            </div>
          )}

          {/* Email Address Field */}
          <div>
            <label
              htmlFor="email-address"
              className="block text-[12.5px] font-bold text-[#1E293B] mb-1 font-serif"
            >
              Email Address
            </label>
            <input
              id="email-address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full h-[42px] px-3.5 rounded-lg border border-[#E2E8F0] bg-white text-[13.5px] text-[#0F172A] placeholder:text-[#94A3B8]/90 focus:border-[#5B89EE] focus:ring-3 focus:ring-[#5B89EE]/15 outline-none transition-all"
            />
          </div>

          {/* Coral / Rose Red CTA Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-[45px] rounded-lg bg-[#EB5777] hover:bg-[#E04868] active:scale-[0.99] transition-all flex items-center justify-center text-white font-bold text-[14.5px] shadow-[0_6px_20px_rgba(235,87,119,0.36)] mt-4 cursor-pointer"
          >
            {isLoading ? 'Preparing Sandbox...' : mode === 'signup' ? 'Get started' : 'Sign in'}
          </button>
        </form>

        {/* Footer Toggle Link: Already have an account? Log in */}
        <div className="mt-4 text-center text-[12px] text-[#1E293B] font-bold">
          <span>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            className="text-[#5B89EE] font-bold ml-1 hover:underline cursor-pointer"
          >
            {mode === 'signup' ? 'Log in' : 'Sign up'}
          </button>
        </div>

        {/* Prominent Demo Mode Section ("记得add for demo ones") */}
        <div className="mt-4 pt-3.5 border-t border-slate-100">
          <button
            type="button"
            onClick={handleDemoSignIn}
            disabled={isLoading}
            className="w-full py-2 px-2.5 rounded-xl bg-gradient-to-r from-[#F0FDF4] via-[#ECFDF5] to-[#EFF6FF] border border-emerald-200/80 hover:border-emerald-400 hover:shadow-xs active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-[11px] font-black shadow-xs shrink-0">
                AS
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[12px] font-black text-slate-800 truncate">
                    Explore Demo Account
                  </span>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 text-[8.5px] font-black px-1.5 py-0.2 shrink-0">
                    DEMO
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium truncate">
                  Pre-loaded RM 7,540 · Subscriptions · Activity
                </p>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-emerald-600 transition-transform group-hover:translate-x-0.5 shrink-0 ml-1.5" />
          </button>
          <p className="text-[9.5px] text-slate-400 text-center mt-1.5">
            💡 Real user sign in starts with a completely zeroed ledger (RM 0.00).
          </p>
        </div>
      </motion.div>
    </div>
  );
}
