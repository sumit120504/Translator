'use client';

import React, { useState } from 'react';
import {
  Volume2,
  CheckCircle,
  Clock,
  Sparkles,
  Copy,
  Check,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { LookupResponse, WordStatus } from '@/lib/types';

interface ResultCardProps {
  result: LookupResponse;
  onStatusChange?: (id: string, newStatus: WordStatus) => Promise<void>;
}

export default function ResultCard({ result, onStatusChange }: ResultCardProps) {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<WordStatus>(result.status || 'new');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Audio pronunciation function
  const playPronunciation = () => {
    if (isPlayingAudio) return;

    if (result.audioUrl) {
      setIsPlayingAudio(true);
      const audio = new Audio(result.audioUrl);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        fallbackSpeechSynthesis();
      };
      audio.play().catch(() => fallbackSpeechSynthesis());
    } else {
      fallbackSpeechSynthesis();
    }
  };

  const fallbackSpeechSynthesis = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsPlayingAudio(true);
      const utterance = new SpeechSynthesisUtterance(result.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const handleCopy = () => {
    const textToCopy = `${result.word} (${result.partOfSpeech}) - ${result.hindiTranslation.join(', ')}\nEnglish: ${result.englishMeaning}\nHindi: ${result.hindiMeaning}\nExample: ${result.example}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStatusToggle = async (status: WordStatus) => {
    if (!result.id || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    setCurrentStatus(status);
    try {
      if (onStatusChange) {
        await onStatusChange(result.id, status);
      } else {
        await fetch(`/api/words/${result.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-6 bg-white dark:bg-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200/80 dark:border-slate-700/80 transition-all">
      {/* Top Bar: Word, Part of Speech, Audio, and Saved Badge */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white capitalize tracking-tight">
            {result.word}
          </h2>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
            {result.partOfSpeech}
          </span>
          {/* Audio Button */}
          <button
            onClick={playPronunciation}
            aria-label="Listen to pronunciation"
            className={`p-2 rounded-full border transition-all ${
              isPlayingAudio
                ? 'bg-indigo-600 text-white border-indigo-600 scale-110 shadow-md shadow-indigo-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 border-slate-200 dark:border-slate-600'
            }`}
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Badge */}
        <div className="flex items-center gap-2">
          {result.fromCache ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <CheckCircle className="w-3.5 h-3.5" />
              In your Vocabulary (Viewed {result.lookupCount || 1}x)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
              Saved to Firestore ✓
            </span>
          )}

          <button
            onClick={handleCopy}
            title="Copy details"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Translation (Big Devanagari Hindi Text) */}
      <div className="py-6 border-b border-slate-100 dark:border-slate-700/60">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          हिंदी अनुवाद (Hindi Translation)
        </span>
        <div className="mt-2 flex flex-wrap items-baseline gap-2.5">
          {result.hindiTranslation.map((tr, index) => (
            <span
              key={index}
              className="text-3xl sm:text-4xl font-extrabold text-indigo-600 dark:text-indigo-400 font-devanagari"
            >
              {tr}
              {index < result.hindiTranslation.length - 1 && (
                <span className="text-slate-300 dark:text-slate-600 font-normal ml-2.5">,</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Meanings: English Definition & Hindi Meaning */}
      <div className="py-6 space-y-5 border-b border-slate-100 dark:border-slate-700/60">
        {/* English Meaning */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Meaning in English
          </span>
          <p className="mt-1.5 text-base sm:text-lg text-slate-800 dark:text-slate-200 leading-relaxed">
            {result.englishMeaning}
          </p>
        </div>

        {/* Hindi Meaning */}
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 font-devanagari">
            हिंदी में अर्थ
          </span>
          <p className="mt-1.5 text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 font-devanagari leading-relaxed">
            {result.hindiMeaning}
          </p>
        </div>

        {/* Example Sentence */}
        {result.example && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Example Sentence
            </span>
            <p className="text-sm sm:text-base italic text-slate-700 dark:text-slate-300">
              "{result.example}"
            </p>
          </div>
        )}
      </div>

      {/* Footer: Learning Status Selection & Revise Link */}
      <div className="pt-6 flex flex-wrap items-center justify-between gap-4">
        {/* Learning Status Pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">Status:</span>
          {(['new', 'learning', 'learned'] as WordStatus[]).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusToggle(st)}
              disabled={isUpdatingStatus}
              className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all ${
                currentStatus === st
                  ? st === 'learned'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : st === 'learning'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Go to revise page button */}
        <Link
          href="/revise"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
        >
          <span>View all saved words</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
