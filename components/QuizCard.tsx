'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, HelpCircle, RotateCw, ArrowLeft, Trophy, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { WordEntry } from '@/lib/types';

interface QuizCardProps {
  words: WordEntry[];
}

interface Question {
  targetWord: WordEntry;
  options: string[];
  correctAnswer: string;
}

export default function QuizCard({ words }: QuizCardProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completed, setCompleted] = useState(false);

  // Generate quiz questions
  useEffect(() => {
    if (words.length < 2) return;

    const generated: Question[] = words.map((target) => {
      // Pick 3 random distractors
      const otherWords = words.filter((w) => w.id !== target.id);
      const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);
      
      const correct = target.hindi_translation.split(',')[0].trim();
      const distractorOptions = shuffledOthers.map(
        (w) => w.hindi_translation.split(',')[0].trim()
      );

      const allOptions = [correct, ...distractorOptions].sort(() => Math.random() - 0.5);

      return {
        targetWord: target,
        options: allOptions,
        correctAnswer: correct,
      };
    });

    // Shuffle questions
    setQuestions(generated.sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setCompleted(false);
    setSelectedOption(null);
    setIsAnswered(false);
  }, [words]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;

    setSelectedOption(option);
    setIsAnswered(true);

    const isCorrect = option === questions[currentIndex].correctAnswer;
    if (isCorrect) {
      setScore((s) => s + 1);
      setStreak((st) => st + 1);
    } else {
      setStreak(0);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setCompleted(true);
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    }
  };

  const restartQuiz = () => {
    const reshuffled = [...questions].sort(() => Math.random() - 0.5);
    setQuestions(reshuffled);
    setCurrentIndex(0);
    setScore(0);
    setStreak(0);
    setCompleted(false);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  if (words.length < 4) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <HelpCircle className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Need at least 4 saved words</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Quiz mode requires at least 4 saved words to generate multiple choice options. You currently have {words.length}.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20"
        >
          Add more words
        </Link>
      </div>
    );
  }

  if (completed) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="max-w-md mx-auto py-12 text-center bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-xl">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Trophy className="w-10 h-10" />
        </div>
        <h3 className="text-3xl font-black text-slate-900 dark:text-white">Quiz Completed!</h3>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-sm">
          You scored <strong className="text-indigo-600 dark:text-indigo-400 text-lg">{score}</strong> out of{' '}
          <strong>{questions.length}</strong> ({percentage}%)
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={restartQuiz}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>Retake Quiz</span>
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

  const q = questions[currentIndex];
  if (!q) return null;

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 px-2">
        <Link
          href="/revise"
          className="flex items-center gap-1.5 text-xs font-semibold hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </Link>

        {/* Score & Streak */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Score: <strong className="text-indigo-600 dark:text-indigo-400">{score}</strong>/{questions.length}
          </span>
          {streak > 1 && (
            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {streak} Streak!
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-600 h-full transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
            What is the Hindi translation of{' '}
            <span className="text-indigo-600 dark:text-indigo-400 capitalize">
              "{q.targetWord.word}"
            </span>
            ?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Part of speech: <span className="font-semibold">{q.targetWord.part_of_speech}</span>
          </p>
        </div>

        {/* 4 Multiple Choice Options */}
        <div className="grid grid-cols-1 gap-3">
          {q.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === q.correctAnswer;

            let buttonStyle =
              'bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-600';

            if (isAnswered) {
              if (isCorrect) {
                buttonStyle =
                  'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300 font-bold';
              } else if (isSelected && !isCorrect) {
                buttonStyle =
                  'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 font-bold';
              } else {
                buttonStyle = 'opacity-40 border-slate-200 dark:border-slate-700';
              }
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleSelect(option)}
                className={`w-full p-4 rounded-2xl border-2 text-left font-devanagari text-lg sm:text-xl font-bold flex items-center justify-between transition-all ${buttonStyle}`}
              >
                <span>{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback / Next Button */}
        {isAnswered && (
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                English Meaning:
              </p>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {q.targetWord.english_meaning}
              </p>
            </div>
            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/20 shrink-0 ml-4"
            >
              {currentIndex < questions.length - 1 ? 'Next →' : 'See Results'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
