import type { ReactNode } from "react";

const logoImage = "/logo.png";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand gradient (desktop only) */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative overflow-hidden bg-gradient-to-br from-orange-950 via-orange-900 to-amber-900">
        {/* Decorative circles */}
        <div
          className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(23 99% 37%), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-20 right-1/4 w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(35 90% 60%), transparent 70%)" }}
        />

        {/* Brand content at bottom */}
        <div className="relative mt-auto p-12 pb-14 w-full">
          <div className="flex items-center gap-3.5 mb-5">
            <div className="h-12 w-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <img
                src={logoImage}
                alt="Translation Helper"
                className="h-7 w-7 object-contain"
              />
            </div>
            <div>
              <p className="text-white font-semibold text-xl tracking-tight">Translation Helper</p>
              <p className="text-white/40 text-xs tracking-wide">by Shema</p>
            </div>
          </div>
          <p className="text-white/50 text-sm max-w-lg leading-relaxed">
            AI-powered voice translation tools for Bible Translation teams.
            Helping communities preserve their languages through technology.
          </p>
        </div>
      </div>

      {/* Right panel — form area */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {/* Subtle decorative gradients */}
        <div
          className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.04] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(23 99% 37%), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-48 -left-48 w-[400px] h-[400px] rounded-full opacity-[0.03] pointer-events-none"
          style={{ background: "radial-gradient(circle, hsl(200 40% 50%), transparent 70%)" }}
        />

        {/* Mobile hero banner */}
        <div className="lg:hidden">
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-orange-950 via-orange-900 to-amber-900">
            <div
              className="absolute top-0 -left-20 w-[300px] h-[300px] rounded-full opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(23 99% 37%), transparent 70%)" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute bottom-5 left-6 sm:left-8 flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
                <img src={logoImage} alt="Translation Helper" className="h-6 w-6 object-contain" />
              </div>
              <span className="text-white font-semibold text-lg tracking-tight drop-shadow-md">
                Translation Helper
              </span>
            </div>
          </div>
        </div>

        {/* Form content */}
        <div className="flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-16 xl:px-20 py-8 lg:py-12 relative">
          <div className="w-full max-w-[420px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
