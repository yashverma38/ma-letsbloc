import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="ambient relative flex min-h-[100dvh] flex-col items-center justify-center px-5 text-center">
      <div className="text-[64px] font-semibold opacity-80">404</div>
      <p className="text-white/60 text-[15px] mt-2 max-w-sm">
        Maa didn&apos;t leave a voice note at this address.
      </p>
      <Link href="/" className="mt-6 btn-ghost">
        ← Back to Maa
      </Link>
    </div>
  );
}
