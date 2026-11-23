'use client';

import React, { useState, useEffect } from 'react';
import { Info, CheckCircle2, ChevronDown, ChevronUp, Flame, KeyRound, Database } from 'lucide-react';

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

  const isConfigured = status.firestoreConfigured ?? status.sheetsConfigured;

  // If Firebase Firestore is not configured, show a gentle banner with setup helper
  if (!isConfigured) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs py-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Local Storage Mode active:</strong> Words are saved in{' '}
              <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded font-mono">
                .data/words.json
              </code>
              . To sync to cloud database, connect <strong>Firebase Firestore</strong> in{' '}
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
            {expanded ? 'Hide Instructions' : 'How to connect Firebase'}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {expanded && (
          <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-amber-500/20 grid grid-cols-1 md:grid-cols-3 gap-3 text-slate-700 dark:text-slate-300">
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                <Flame className="w-3.5 h-3.5 text-amber-500" /> 1. Firebase Project
              </span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-indigo-600 underline">Firebase Console</a>, create or select a project, and enable <strong>Cloud Firestore</strong> database.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                <KeyRound className="w-3.5 h-3.5 text-indigo-500" /> 2. Service Account Key
              </span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                In Project Settings → <strong>Service accounts</strong> tab, click <strong>Generate new private key</strong> to download your JSON file.
              </p>
            </div>
            <div className="bg-white/80 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className="font-bold flex items-center gap-1 text-slate-900 dark:text-white">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> 3. Set .env.local
              </span>
              <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                FIREBASE_PROJECT_ID=...<br />
                FIREBASE_CLIENT_EMAIL=...<br />
                FIREBASE_PRIVATE_KEY="..."
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
