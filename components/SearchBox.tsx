'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2, X, Sparkles } from 'lucide-react';

interface SearchBoxProps {
  onSearch: (word: string) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_WORDS = [
  'resilient',
  'serendipity',
  'ephemeral',
  'ubiquitous',
  'compassion',
  'perseverance',
  'book',
  'love',
];

export default function SearchBox({ onSearch, isLoading }: SearchBoxProps) {
  const [word, setWord] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus search box on page load
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setInputError(null);

    const trimmed = word.trim();
    if (!trimmed) {
      setInputError('Please enter an English word.');
      return;
    }

    // Check Devanagari script
    if (/[\u0900-\u097F]/.test(trimmed)) {
      setInputError('Please enter an English word (Devanagari script detected).');
      return;
    }

    if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) {
      setInputError('Please use English letters only (no numbers or special characters).');
      return;
    }

    if (trimmed.length > 45) {
      setInputError('Word is too long (maximum 45 characters).');
      return;
    }

    onSearch(trimmed);
  };

  const handleChipClick = (sample: string) => {
    setWord(sample);
    setInputError(null);
    onSearch(sample);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="relative flex items-center shadow-xl rounded-2xl bg-white dark:bg-slate-800/90 border-2 border-slate-200 dark:border-slate-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-400 transition-all p-1.5 sm:p-2">
          <div className="pl-3 pr-2 text-slate-400 dark:text-slate-500">
            <Search className="w-6 h-6" />
          </div>

          <input
            ref={inputRef}
            type="text"
            value={word}
            onChange={(e) => {
              setWord(e.target.value);
              if (inputError) setInputError(null);
            }}
            placeholder="Type an English word (e.g. resilient, book)..."
            disabled={isLoading}
            className="w-full bg-transparent text-lg sm:text-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none px-2 py-2"
          />

          {word && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setWord('');
                setInputError(null);
                inputRef.current?.focus();
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 mr-2"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading || !word.trim()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium px-5 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20 shrink-0 text-sm sm:text-base"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="hidden sm:inline">Translating...</span>
              </>
            ) : (
              <>
                <span>Translate</span>
                <span className="hidden sm:inline font-devanagari text-indigo-200">खोजें</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Validation error notice */}
      {inputError && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400 font-medium px-2">
          {inputError}
        </p>
      )}

      {/* Quick suggestions chips */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap px-1">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Try:
        </span>
        {SAMPLE_WORDS.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => handleChipClick(sample)}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 dark:bg-slate-800 dark:hover:bg-indigo-950/60 dark:text-slate-300 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
}
