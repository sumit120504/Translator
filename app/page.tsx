'use client';

import React, { useState, useEffect } from 'react';
import SearchBox from '@/components/SearchBox';
import ResultCard from '@/components/ResultCard';
import { LookupResponse } from '@/lib/types';
import { AlertCircle, History, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [result, setResult] = useState<LookupResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentLookups, setRecentLookups] = useState<string[]>([]);

  // Load recent lookups from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('recent_lookups');
      if (saved) {
        setRecentLookups(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleSearch = async (word: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to look up word.');
      }

      setResult(data);

      // Save to recent list
      const updatedRecent = [
        data.word,
        ...recentLookups.filter((w) => w.toLowerCase() !== data.word.toLowerCase()),
      ].slice(0, 5);

      setRecentLookups(updatedRecent);
      localStorage.setItem('recent_lookups', JSON.stringify(updatedRecent));
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center space-y-3 pt-2 sm:pt-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Auto-saves every word to Firebase Firestore</span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          Master English Words with{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-amber-500">
            Hindi Meanings
          </span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
          Type any English word to get accurate Hindi translation, English definition, and Hindi explanation, then practice in flashcard mode.
        </p>
      </div>

      {/* Word Search Box */}
      <SearchBox onSearch={handleSearch} isLoading={isLoading} />

      {/* Error state */}
      {error && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 text-red-800 dark:text-red-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{error}</p>
          </div>
        </div>
      )}

      {/* Result Card */}
      {result && <ResultCard result={result} />}

      {/* Recent Lookups (Section 10 of Blueprint: Recent 5 lookups below the card) */}
      {recentLookups.length > 0 && (
        <div className="max-w-2xl mx-auto pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" /> Recent Lookups
            </span>
            <Link
              href="/revise"
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all saved words</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {recentLookups.map((w) => (
              <button
                key={w}
                onClick={() => handleSearch(w)}
                className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 hover:border-indigo-500 hover:text-indigo-600 transition-colors shadow-sm capitalize"
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
