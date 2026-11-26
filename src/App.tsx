/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CandlestickChart, Loader2 } from 'lucide-react';
import LoginPage from './components/LoginPage';
import TradingViewWorkspace from './components/TradingViewWorkspace';
import { isSupabaseConfigured, resolveUsernameFromUser, supabase } from './lib/supabaseClient';
import {
  collectUnseededLocalDrawings,
  fetchAllCloudDrawings,
  fetchCloudWorkspaceState,
  fetchUserProfile,
  upsertCloudDrawings,
  type CloudWorkspaceState,
} from './lib/cloudStorage';
import type { SerializedOverlay } from './types/chart';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [hydratingWorkspace, setHydratingWorkspace] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('trader');
  const [cloudState, setCloudState] = useState<CloudWorkspaceState | null>(null);
  const [cloudDrawings, setCloudDrawings] = useState<Record<string, SerializedOverlay[]>>({});
  const hydratedUserIdRef = useRef<string | null>(null);

  const hydrateForSession = useCallback(async (activeSession: Session) => {
    const uid = activeSession.user.id;
    if (hydratedUserIdRef.current === uid) return;

    setHydratingWorkspace(true);
    try {
      const [profileRes, stateRes, drawingsRes] = await Promise.allSettled([
        fetchUserProfile(uid),
        fetchCloudWorkspaceState(uid),
        fetchAllCloudDrawings(uid),
      ]);

      const profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
      const fetchedState = stateRes.status === 'fulfilled' ? stateRes.value : null;
      const fetchedDrawings = drawingsRes.status === 'fulfilled' ? drawingsRes.value : {};

      // Migrate any locally drawn trendlines not yet present in Supabase for this user
      const unseededLocal = collectUnseededLocalDrawings(fetchedDrawings);
      const mergedDrawings: Record<string, SerializedOverlay[]> = { ...fetchedDrawings };
      const unseededEntries = Object.entries(unseededLocal);
      if (unseededEntries.length > 0) {
        for (const [sym, overlays] of unseededEntries) {
          mergedDrawings[sym] = overlays;
        }
        Promise.allSettled(
          unseededEntries.map(([sym, overlays]) => upsertCloudDrawings(uid, sym, overlays))
        ).catch(() => {});
      }

      hydratedUserIdRef.current = uid;
      setUsername(resolveUsernameFromUser(activeSession.user, profile?.username));
      setCloudState(fetchedState);
      setCloudDrawings(mergedDrawings);
    } finally {
      setHydratingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setCheckingAuth(false);
      return;
    }

    let cancelled = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const currentSession = data.session ?? null;
      setSession(currentSession);
      setCheckingAuth(false);
      if (currentSession) {
        await hydrateForSession(currentSession);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (cancelled) return;
      setSession(nextSession ?? null);
      if (nextSession) {
        await hydrateForSession(nextSession);
      } else {
        hydratedUserIdRef.current = null;
        setCloudState(null);
        setCloudDrawings({});
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [hydrateForSession]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    try {
      const toRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('meridian_')) {
          toRemove.push(key);
        }
      }
      for (const k of toRemove) {
        window.localStorage.removeItem(k);
      }
    } catch {
      // Ignore storage cleanup issues
    }
    hydratedUserIdRef.current = null;
    setSession(null);
    setCloudState(null);
    setCloudDrawings({});
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen w-screen bg-[#070708] text-neutral-100 flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl bg-[#0d0d0f] border border-white/[0.12] p-6 space-y-2 text-sm">
          <h1 className="font-semibold text-white">Konfigurasi Supabase Diperlukan</h1>
          <p className="text-xs text-neutral-400">
            Set environment variable <code className="font-mono">VITE_SUPABASE_URL</code> dan{' '}
            <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> agar autentikasi dan
            penyimpanan cloud dapat berjalan.
          </p>
        </div>
      </div>
    );
  }

  if (checkingAuth || (session && hydratingWorkspace)) {
    return (
      <div className="min-h-screen w-screen bg-[#070708] text-neutral-100 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.08] border border-white/[0.14] flex items-center justify-center text-white">
          <CandlestickChart className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
          <span>
            {checkingAuth ? 'Memeriksa sesi login…' : 'Memuat chart & gambar dari Supabase…'}
          </span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginPage
        onSuccess={async () => {
          if (!supabase) return;
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            setSession(data.session);
            await hydrateForSession(data.session);
          }
        }}
      />
    );
  }

  return (
    <TradingViewWorkspace
      key={session.user.id}
      userId={session.user.id}
      username={username}
      accessToken={session.access_token}
      initialCloudState={cloudState}
      initialCloudDrawings={cloudDrawings}
      onSignOut={handleSignOut}
    />
  );
}
