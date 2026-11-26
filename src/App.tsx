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
    hydratedUserIdRef.current = null;
    setSession(null);
    setCloudState(null);
    setCloudDrawings({});
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen w-screen bg-[#0b0e14] text-[#e6eaf2] flex items-center justify-center p-6">
        <div className="max-w-md rounded-xl bg-[#131722] border border-[#2a3142] p-6 space-y-2 text-sm">
          <h1 className="font-semibold text-[#f0f3fa]">Konfigurasi Supabase Diperlukan</h1>
          <p className="text-xs text-[#98a2b3]">
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
      <div className="min-h-screen w-screen bg-[#0b0e14] text-[#e6eaf2] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#2962ff]/15 border border-[#2962ff]/40 flex items-center justify-center text-[#5b9cf6]">
          <CandlestickChart className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-2 text-xs text-[#98a2b3]">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2962ff]" />
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
