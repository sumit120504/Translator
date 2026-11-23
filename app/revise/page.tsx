'use client';

import React, { useState, useEffect } from 'react';
import WordTable from '@/components/WordTable';
import { WordEntry } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

export default function RevisePage() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    learning: 0,
    learned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWords = async () => {
    try {
      const res = await fetch('/api/words');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch words.');
      setWords(data.words || []);
      setStats(
        data.stats || {
          total: data.words?.length || 0,
          new: 0,
          learning: 0,
          learned: 0,
        }
      );
    } catch (err: any) {
      setError(err?.message || 'Error loading saved words.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWords();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          My Saved Words
        </h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
          Review, filter, practice flashcards, and track your progress across your saved vocabulary.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Loading your vocabulary list...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      ) : (
        <WordTable initialWords={words} stats={stats} onRefresh={fetchWords} />
      )}
    </div>
  );
}
