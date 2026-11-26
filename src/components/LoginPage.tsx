import React, { useState } from 'react';
import {
  ArrowRight,
  CandlestickChart,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import loginBgImage from '../assets/login-bg.jpg';
import { isSupabaseConfigured, normalizeLoginIdentifier, supabase } from '../lib/supabaseClient';

interface LoginPageProps {
  onSuccess: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !isSupabaseConfigured) {
      setErrorMsg('Konfigurasi Supabase belum tersedia pada environment aplikasi.');
      return;
    }

    const email = normalizeLoginIdentifier(username);
    if (!email || !password) {
      setErrorMsg('Masukkan username dan password Anda.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.session) {
        setErrorMsg('Username atau password salah. Silakan periksa kembali.');
        return;
      }

      onSuccess();
    } catch {
      setErrorMsg('Gagal menghubungi server autentikasi. Coba lagi sebentar.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="login-page"
      className="min-h-dvh w-screen bg-[#070708] text-neutral-100 flex items-center justify-center p-4 sm:p-8 relative overflow-y-auto"
    >
      {/* Monochrome stock chart background artwork */}
      <img
        src={loginBgImage}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover object-center opacity-85 scale-[1.02]"
      />

      {/* Soft atmospheric vignette for effortless readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at center, rgba(7,7,8,0.16) 0%, rgba(7,7,8,0.46) 65%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* Relaxed monochrome niche-style login card */}
      <div className="relative w-full max-w-[404px] rounded-2xl bg-[#0d0d0f]/82 border border-white/[0.12] shadow-[0_28px_90px_rgba(0,0,0,0.85)] p-7 sm:p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3.5 mb-7">
          <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-white shrink-0">
            <CandlestickChart className="w-5 h-5 stroke-[1.75]" />
          </div>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight text-white leading-snug">
              TrillReference
            </h1>
            <p className="text-xs text-neutral-400 mt-0.5">
              Financial Charting &amp; Cloud Workspace
            </p>
          </div>
        </div>

        <p className="text-[13px] leading-relaxed text-neutral-400 mb-6">
          Masuk dengan tenang ke ruang analisis Anda — chart, garis tren, dan watchlist siap dilanjutkan kapan saja.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="block text-xs font-medium text-neutral-300"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-black/55 border border-white/[0.12] text-base sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-neutral-300"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full h-11 pl-10 pr-11 rounded-xl bg-black/55 border border-white/[0.12] text-base sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/10 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              data-testid="login-error"
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.07] border border-white/25 text-xs text-neutral-100"
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full h-11 rounded-xl bg-white hover:bg-neutral-200 active:scale-[0.99] disabled:opacity-60 text-neutral-950 text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_6px_24px_rgba(255,255,255,0.12)]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi…</span>
              </>
            ) : (
              <>
                <span>Masuk ke Chart</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/[0.08] flex items-center gap-2.5 text-[11px] leading-relaxed text-neutral-400">
          <ShieldCheck className="w-4 h-4 text-neutral-300 shrink-0" />
          <span>
            Gambar trendline, indikator &amp; watchlist tersimpan otomatis di akun Supabase Anda.
          </span>
        </div>
      </div>
    </div>
  );
}
