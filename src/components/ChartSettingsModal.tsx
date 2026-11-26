import React, { useEffect, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import {
  DEFAULT_CHART_SETTINGS,
  type ChartDisplaySettings,
} from '../utils/chartStyles';

interface ChartSettingsModalProps {
  open: boolean;
  settings: ChartDisplaySettings;
  onLiveChange: (next: ChartDisplaySettings) => void;
  onConfirm: (next: ChartDisplaySettings) => void;
  onCancel: (original: ChartDisplaySettings) => void;
}

const SETTING_ITEMS: ReadonlyArray<{
  key: keyof ChartDisplaySettings;
  label: string;
  description: string;
}> = [
  {
    key: 'showZoomControls',
    label: 'Zoom & Fit Controls (- / + / Fit)',
    description: 'Tampilkan tombol navigasi zoom & fit di bagian bawah tengah chart',
  },
  {
    key: 'showGridLines',
    label: 'Grid Lines',
    description: 'Tampilkan garis kotak horizontal & vertikal pada latar chart',
  },
  {
    key: 'showCrosshair',
    label: 'Crosshair',
    description: 'Tampilkan garis bidik kursor beserta label harga & waktu',
  },
  {
    key: 'showLastPriceLine',
    label: 'Last Price Line',
    description: 'Tampilkan garis putus-putus harga terakhir di sumbu Y',
  },
  {
    key: 'showHighLowMarks',
    label: 'High / Low Price Marks',
    description: 'Tampilkan penanda harga tertinggi dan terendah pada chart',
  },
  {
    key: 'showOhlcHeader',
    label: 'OHLC Legend Header',
    description: 'Tampilkan baris Open, High, Low, Close & Volume di atas chart',
  },
];

export default function ChartSettingsModal({
  open,
  settings,
  onLiveChange,
  onConfirm,
  onCancel,
}: ChartSettingsModalProps) {
  const [draft, setDraft] = useState<ChartDisplaySettings>(settings);
  const [snapshot, setSnapshot] = useState<ChartDisplaySettings>(settings);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft({ ...settings });
      setSnapshot({ ...settings });
      setConfirmResetOpen(false);
    }
    // Sync snapshot only when opening
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmResetOpen) {
          setConfirmResetOpen(false);
        } else {
          onCancel(snapshot);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, confirmResetOpen, snapshot, onCancel]);

  if (!open) return null;

  const toggleKey = (key: keyof ChartDisplaySettings) => {
    const next = { ...draft, [key]: !draft[key] };
    setDraft(next);
    onLiveChange(next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chart settings"
      className="fixed inset-0 bg-black/55 flex items-center justify-center p-4 z-50"
      onClick={() => onCancel(snapshot)}
    >
      <div
        className="w-full max-w-[420px] rounded-xl bg-white dark:bg-[#17181c] border border-slate-200 dark:border-[#2c2f38] shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#2c2f38] flex items-center justify-between">
          <h2 className="text-[16px] font-semibold tracking-tight text-slate-900 dark:text-[#f0f3fa]">
            Chart Settings
          </h2>
          <button
            type="button"
            onClick={() => onCancel(snapshot)}
            aria-label="Close chart settings"
            className="w-8 h-8 rounded-md flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-[#8b95a7] dark:hover:bg-[#252832] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 max-h-[65vh] overflow-y-auto thin-scrollbar">
          {SETTING_ITEMS.map((item) => {
            const checked = draft[item.key];
            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-3 py-1"
              >
                <button
                  type="button"
                  onClick={() => toggleKey(item.key)}
                  className="flex-1 text-left cursor-pointer"
                >
                  <div className="text-[13px] font-medium text-slate-800 dark:text-[#e6eaf2]">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-[#8b95a7]">
                    {item.description}
                  </div>
                </button>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={item.label}
                  onClick={() => toggleKey(item.key)}
                  className={`mt-0.5 w-[18px] h-[18px] rounded-[4px] flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                    checked
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-[#f0f3fa] dark:border-[#f0f3fa] dark:text-[#131722]'
                      : 'bg-transparent border-slate-400 hover:border-slate-600 dark:border-[#5b6270] dark:hover:border-[#98a2b3]'
                  }`}
                >
                  {checked && <Check className="w-3 h-3 stroke-[3]" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#2c2f38] flex items-center justify-between bg-slate-50/70 dark:bg-[#17181c]">
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="h-9 px-3 rounded-md border border-slate-300 dark:border-[#363a45] flex items-center gap-1.5 text-[13px] text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#252832] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Defaults</span>
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onCancel(snapshot)}
              className="h-9 px-4 rounded-md border border-slate-300 dark:border-[#434651] text-[13px] font-medium text-slate-700 hover:bg-slate-100 dark:text-[#f0f3fa] dark:hover:bg-[#252832] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(draft)}
              className="h-9 px-5 rounded-md text-[13px] font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#f0f3fa] dark:text-[#131722] dark:hover:bg-white transition-colors cursor-pointer"
            >
              Ok
            </button>
          </div>
        </div>
      </div>

      {confirmResetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi reset chart settings"
          className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-[70]"
          onClick={() => setConfirmResetOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg bg-white dark:bg-[#1e222d] border border-slate-200 dark:border-[#2a2e39] shadow-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-[#f0f3fa]">
                Reset Chart Settings ke Default?
              </h3>
              <p className="text-xs text-slate-600 dark:text-[#b2b5be]">
                Apakah Anda yakin ingin mengembalikan seluruh pengaturan tampilan chart ke kondisi awal?
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="h-8 px-3 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-[#d1d4dc] dark:hover:bg-[#2a2e39] cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const reset = { ...DEFAULT_CHART_SETTINGS };
                  setDraft(reset);
                  onLiveChange(reset);
                  setConfirmResetOpen(false);
                }}
                className="h-8 px-3.5 rounded text-xs font-semibold bg-[#f23645] hover:bg-[#d92b3a] text-white cursor-pointer"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
