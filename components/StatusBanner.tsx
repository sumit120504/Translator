'use client';

import React, { useState, useEffect } from 'react';
import { Info, CheckCircle2, ChevronDown, ChevronUp, FileSpreadsheet, KeyRound } from 'lucide-react';

export default function StatusBanner() {
  const [status, setStatus] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  if (!status) return null;

  // If Google Sheets is not configured, show a gentle banner with setup helper
  if (!status.sheetsConfigured) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Local Storage Mode active:</strong> Lookups are saved locally in{' '}
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">
                .data/words.json
              </code>
              . To sync directly to your Google Sheet, configure credentials in{' '}
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">
                .env.local
              </code>
              .
            </span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center gap-1"
          >
            {expanded ? 'Hide Instructions' : 'How to connect Sheet'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {expanded && (
          <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300">
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> 1. Service Account
              </span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                In Google Cloud Console, enable <strong>Google Sheets API</strong>, create a Service Account, and download the JSON key.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> 2. Share Sheet
              </span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                Create a Google Sheet with a tab named <strong>Words</strong>. Click Share and give your service account email <strong>Editor</strong> access.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" /> 3. Set .env.local
              </span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                GOOGLE_SHEET_ID=...<br />
                GOOGLE_SERVICE_ACCOUNT_EMAIL=...<br />
                GOOGLE_PRIVATE_KEY="..."
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
