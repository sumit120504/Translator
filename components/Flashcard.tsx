'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Volume2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  CheckCircle2,
  BookOpen,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { WordEntry, WordStatus } from '@/lib/types';

interface FlashcardProps {
  initialWords: WordEntry[];
}

export default function FlashcardDeck({ initialWords }: FlashcardProps) {
  const [words, setWords] = useState<WordEntry[]>(initialWords);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  const currentWord = words[currentIndex];

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCompleted(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  }, [currentIndex, words.length]);

  const handlePrev = useCallback(() => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setCompleted(false);
  };

  const updateStatus = async (status: WordStatus) => {
    if (!currentWord) return;

    // Update locally
    setWords((prev) =>
      prev.map((w, idx) => (idx === currentIndex ? { ...w, status } : w))
    );

    try {
      await fetch(`/api/words/${currentWord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }

    handleNext();
  };

  const playPronunciation = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (completed) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '1') {
        updateStatus('learning');
      } else if (e.key === '2') {
        updateStatus('learned');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, completed]);

  if (words.length === 0) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <BookOpen className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">No words to practice yet</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Start by searching English words on the Home page to build your vocabulary deck.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          Look up words
        </Link>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-md mx-auto py-16 text-center bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white">Deck Completed! 🎉</h3>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
          You've reviewed all <strong>{words.length}</strong> flashcards.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setCurrentIndex(0);
              setCompleted(false);
              setIsFlipped(false);
            }}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Practice Again</span>
          </button>
          <Link
            href="/revise"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors"
          >
            Back to Words List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Top Deck Controls */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-2">
        <Link
          href="/revise"
          className="flex items-center gap-1.5 text-xs font-semibold hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </Link>

        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-900 dark:text-white">
            {currentIndex + 1}
          </span>
          <span>of</span>
          <span className="font-semibold text-slate-900 dark:text-white">{words.length}</span>
        </div>

        {/* Shuffle */}
        <button
          onClick={handleShuffle}
          title="Shuffle cards"
          className="flex items-center gap-1 text-xs font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Shuffle</span>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
        />
      </div>

      {/* 3D Interactive Card Flip Container */}
      <div
        onClick={handleFlip}
        className="w-full min-h-[380px] cursor-pointer rounded-3xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-6 sm:p-8 flex flex-col justify-between transition-all hover:border-indigo-500 dark:hover:border-indigo-400 select-none relative group"
      >
        {!isFlipped ? (
          /* FRONT SIDE */
          <div className="flex flex-col justify-between h-full min-h-[320px]">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                {currentWord.part_of_speech}
              </span>
              <button
                onClick={(e) => playPronunciation(e, currentWord.word)}
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 transition-colors"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center my-auto py-8">
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                {currentWord.word}
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 flex items-center justify-center gap-1">
                <span>Tap card or press Space to reveal Hindi & meaning</span>
              </p>
            </div>

            <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
              Click anywhere to flip ↷
            </div>
          </div>
        ) : (
          /* BACK SIDE */
          <div className="flex flex-col justify-between h-full min-h-[320px] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Answer / उत्तर
              </span>
              <button
                onClick={(e) => playPronunciation(e, currentWord.word)}
                className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-2">
              {/* Hindi Translation */}
              <div>
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                  हिंदी अनुवाद
                </span>
                <p className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 font-devanagari mt-1">
                  {currentWord.hindi_translation}
                </p>
              </div>

              {/* English Meaning */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  English Meaning
                </span>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 mt-0.5">
                  {currentWord.english_meaning}
                </p>
              </div>

              {/* Hindi Meaning */}
              <div>
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 font-devanagari">
                  हिंदी में अर्थ
                </span>
                <p className="text-sm sm:text-base font-medium text-slate-800 dark:text-slate-200 font-devanagari mt-0.5">
                  {currentWord.hindi_meaning}
                </p>
              </div>

              {/* Example */}
              {currentWord.example_sentence && (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <p className="text-xs italic text-slate-600 dark:text-slate-400">
                    "{currentWord.example_sentence}"
                  </p>
                </div>
              )}
            </div>

            <div className="text-center text-xs text-slate-400 dark:text-slate-500 font-medium pt-2 border-t border-slate-100 dark:border-slate-700">
              Tap again to return to front
            </div>
          </div>
        )}
      </div>

      {/* Answer & Revision Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => updateStatus('learning')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-semibold text-sm transition-all"
        >
          <span>Still Learning [1]</span>
        </button>

        <button
          onClick={() => updateStatus('learned')}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all shadow-md shadow-emerald-600/20"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Knew It! [2]</span>
        </button>
      </div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Previous (←)</span>
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <span>Next (→)</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
