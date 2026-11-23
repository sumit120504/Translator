'use client';

import React, { useState, useEffect } from 'react';
import FlashcardDeck from '@/components/Flashcard';
import { WordEntry } from '@/lib/types';
import { Loader2, AlertCircle } from 'lucide-react';

export default function FlashcardsPage() {
  const [words, setWords] = useState<WordEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/words')
      .then((res) => res.json())
      .then((data) => {
        setWords(data.words || []);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load flashcard deck.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Flashcard Revision
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Test your recall: guess the Hindi translation and meaning before flipping each card.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-sm font-medium text-slate-500">Preparing flashcards...</p>
        </div>
      ) : error ? (
        <div className="max-w-md mx-auto p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <p>{error}</p>
        </div>
      ) : (
        <FlashcardDeck initialWords={words} />
      )}
    </div>
  );
}
