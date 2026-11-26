import type { ChartCandleType, SerializedOverlay, ThemeMode, YAxisScaleType } from '../types/chart';
import type { IndicatorInstance } from '../indicators/indicatorModel';
import type { ScreenerPreset } from '../../shared/screenerModel';
import type { ChartDisplaySettings } from '../utils/chartStyles';
import type {
  ActiveWatchlistRef,
  CustomWatchlist,
  WatchlistColumnPrefs,
  WatchlistFlagMap,
} from '../utils/watchlistModel';
import { loadSymbolDrawings, parseSerializedOverlays, saveSymbolDrawings, serializeOverlays } from '../utils/drawingStorage';
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabase } from './supabaseClient';

export type CloudSyncStatus = 'idle' | 'saving' | 'synced' | 'error';

export interface CloudWorkspaceState {
  symbol?: string;
  timeframe?: string;
  chartType?: ChartCandleType;
  yAxisScale?: YAxisScaleType;
  theme?: ThemeMode;
  indicators?: IndicatorInstance[];
  customWatchlists?: CustomWatchlist[];
  activeWatchlistRef?: ActiveWatchlistRef;
  watchlistFlagMap?: WatchlistFlagMap;
  watchlistColumnPrefs?: WatchlistColumnPrefs;
  chartSettings?: ChartDisplaySettings;
  favoriteTimeframes?: string[];
  savedScreenerPresets?: ScreenerPreset[];
}

export interface UserProfileRecord {
  id: string;
  username: string;
  display_name: string;
}

export async function fetchUserProfile(userId: string): Promise<UserProfileRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as UserProfileRecord;
}

export async function fetchAllCloudDrawings(
  userId: string
): Promise<Record<string, SerializedOverlay[]>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('chart_drawings')
    .select('symbol, overlays')
    .eq('user_id', userId);

  if (error || !Array.isArray(data)) {
    throw error ?? new Error('Unable to load saved chart drawings');
  }

  const map: Record<string, SerializedOverlay[]> = {};
  for (const row of data) {
    const sym = typeof row?.symbol === 'string' ? row.symbol.trim().toUpperCase() : '';
    if (!sym) continue;
    const valid = serializeOverlays(Array.isArray(row.overlays) ? row.overlays : []);
    map[sym] = valid;
    // Mirror authoritative cloud snapshot into local cache so subsequent symbol switches are instant
    saveSymbolDrawings(sym, valid);
  }
  return map;
}

export async function upsertCloudDrawings(
  userId: string,
  symbol: string,
  overlays: SerializedOverlay[],
  options?: { accessToken?: string; keepalive?: boolean }
): Promise<void> {
  const normalizedSymbol = symbol.trim().toUpperCase();
  if (!normalizedSymbol) return;
  const serialized = serializeOverlays(overlays);

  // Use native fetch with keepalive when flushing during pagehide/beforeunload (<64KB browser cap)
  if (options?.keepalive && options.accessToken && SUPABASE_URL && SUPABASE_ANON_KEY) {
    const body = JSON.stringify({
      user_id: userId,
      symbol: normalizedSymbol,
      overlays: serialized,
    });
    if (body.length < 60_000) {
      await fetch(`${SUPABASE_URL}/rest/v1/chart_drawings?on_conflict=user_id,symbol`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body,
      });
      return;
    }
  }

  if (!supabase) return;
  const { error } = await supabase.from('chart_drawings').upsert(
    {
      user_id: userId,
      symbol: normalizedSymbol,
      overlays: serialized,
    },
    { onConflict: 'user_id,symbol' }
  );

  if (error) {
    throw error;
  }
}

export async function fetchCloudWorkspaceState(userId: string): Promise<CloudWorkspaceState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('user_workspace_state')
    .select('state')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data || !data.state || typeof data.state !== 'object') {
    return null;
  }
  return data.state as CloudWorkspaceState;
}

export async function saveCloudWorkspaceState(
  userId: string,
  state: CloudWorkspaceState,
  options?: { accessToken?: string; keepalive?: boolean }
): Promise<void> {
  if (options?.keepalive && options.accessToken && SUPABASE_URL && SUPABASE_ANON_KEY) {
    const body = JSON.stringify({ user_id: userId, state });
    if (body.length < 60_000) {
      await fetch(`${SUPABASE_URL}/rest/v1/user_workspace_state?on_conflict=user_id`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${options.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates,return=minimal',
        },
        body,
      });
      return;
    }
  }

  if (!supabase) return;
  const { error } = await supabase.from('user_workspace_state').upsert(
    {
      user_id: userId,
      state,
    },
    { onConflict: 'user_id' }
  );
  if (error) {
    throw error;
  }
}

/**
 * Collects any pre-existing localStorage drawings for symbols that do not yet exist in Supabase
 * (one-time seamless migration if the user had drawn lines before cloud sync was enabled).
 */
export function collectUnseededLocalDrawings(
  cloudDrawings: Record<string, SerializedOverlay[]>
): Record<string, SerializedOverlay[]> {
  if (typeof window === 'undefined') return {};
  const prefix = 'meridian_drawings_v1_';
  const unseeded: Record<string, SerializedOverlay[]> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(prefix)) continue;
      const sym = key.slice(prefix.length).trim().toUpperCase();
      if (!sym || sym in cloudDrawings) continue;
      const parsed = parseSerializedOverlays(window.localStorage.getItem(key));
      if (parsed.length > 0) {
        unseeded[sym] = parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return unseeded;
}

export function resolveDrawingsWithCloud(
  symbol: string,
  cloudDrawings: Record<string, SerializedOverlay[]>
): SerializedOverlay[] {
  const sym = symbol.trim().toUpperCase();
  if (sym in cloudDrawings) {
    return cloudDrawings[sym];
  }
  return loadSymbolDrawings(sym);
}
