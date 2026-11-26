import React, { useState } from 'react';
import { CandlestickChart, Eye, EyeOff, Loader2, Lock, ShieldCheck, User } from 'lucide-react';
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
      className="min-h-screen w-screen bg-[#0b0e14] text-[#e6eaf2] flex items-center justify-center p-4 relative overflow-hidden"
    >
      {/* Subtle TradingView grid background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'linear-gradient(to right, #1e2433 1px, transparent 1px), linear-gradient(to bottom, #1e2433 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-[390px] rounded-xl bg-[#131722]/95 border border-[#262c3a] shadow-2xl p-7 backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-[#2962ff]/15 border border-[#2962ff]/40 flex items-center justify-center text-[#5b9cf6] shrink-0">
            <CandlestickChart className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[#f0f3fa]">TrillReference</h1>
            <p className="text-xs text-[#8b95a7]">
              Financial Charting &amp; Cloud Workspace
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="login-username"
              className="block text-xs font-medium text-[#b2b5be]"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#787b86] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-username"
                type="text"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-[#0b0e14] border border-[#2a3142] text-sm text-[#f0f3fa] placeholder:text-[#555e70] focus:outline-none focus:border-[#2962ff] transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-xs font-medium text-[#b2b5be]"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#787b86] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full h-10 pl-9 pr-10 rounded-lg bg-[#0b0e14] border border-[#2a3142] text-sm text-[#f0f3fa] placeholder:text-[#555e70] focus:outline-none focus:border-[#2962ff] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[#787b86] hover:text-[#f0f3fa] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              data-testid="login-error"
              className="px-3 py-2 rounded-lg bg-[#2a1518] border border-[#ef5350]/50 text-xs text-[#fca5a5]"
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-10 rounded-lg bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memverifikasi…</span>
              </>
            ) : (
              <span>Masuk ke Chart</span>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-[#1f2430] flex items-center gap-2 text-[11px] text-[#787b86]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#089981] shrink-0" />
          <span>
            Gambar trendline, indikator &amp; watchlist tersimpan otomatis di akun Supabase Anda.
          </span>
        </div>
      </div>
    </div>
  );
}
