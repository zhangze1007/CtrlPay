import { MobileAppShell } from '@/components/mobile-app-shell';

/**
 * CtrlPay sandbox.
 *
 * The ONLY thing on screen is the phone App. The Sign In / Sign Up flow,
 * Demo Account switcher, and full student defensive financial engine
 * all live seamlessly inside the phone container.
 */
export default function Page() {
  return (
    <main className="ct-studio grid min-h-[100svh] w-full place-items-center p-6 max-[500px]:p-0">
      <MobileAppShell />
    </main>
  );
}
