'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Trash2,
  Volume2,
  Layers,
  HelpCircle,
  RefreshCw,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';
import { WordEntry, WordStatus } from '@/lib/types';

interface WordTableProps {
  initialWords: WordEntry[];
  stats: {
    total: number;
    new: number;
    learning: number;
    learned: number;
  };
  onRefresh: () => Promise<void>;
}

export default function WordTable({ initialWords, stats, onRefresh }: WordTableProps) {
  const [words, setWords] = useState<WordEntry[]>(initialWords);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WordStatus>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alpha' | 'lookups'>('newest');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sync state if initialWords changes
  React.useEffect(() => {
    setWords(initialWords);
  }, [initialWords]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const playPronunciation = (word: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStatusChange = async (id: string, newStatus: WordStatus) => {
    // Optimistic update
    setWords((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
    );

    try {
      await fetch(`/api/words/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleDelete = async (id: string, wordName: string) => {
    if (!confirm(`Are you sure you want to delete "${wordName}" from your list?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/words/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setWords((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete word:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (words.length === 0) return;

    const headers = [
      'ID',
      'Word',
      'Part of Speech',
      'Hindi Translation',
      'English Meaning',
      'Hindi Meaning',
      'Example Sentence',
      'Status',
      'Lookup Count',
      'Date Added',
    ];

    const rows = words.map((w) => [
      w.id,
      `"${w.word.replace(/"/g, '""')}"`,
      `"${w.part_of_speech.replace(/"/g, '""')}"`,
      `"${w.hindi_translation.replace(/"/g, '""')}"`,
      `"${w.english_meaning.replace(/"/g, '""')}"`,
      `"${w.hindi_meaning.replace(/"/g, '""')}"`,
      `"${w.example_sentence.replace(/"/g, '""')}"`,
      w.status,
      w.lookup_count || 1,
      w.date_added,
    ]);

    // UTF-8 BOM for Devanagari in Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `word-learner-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter and sort words
  const filteredWords = words
    .filter((w) => {
      const matchesSearch =
        !searchQuery ||
        w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.hindi_translation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.english_meaning.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.hindi_meaning.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || w.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'oldest') return parseInt(a.id, 10) - parseInt(b.id, 10);
      if (sortBy === 'alpha') return a.word.localeCompare(b.word);
      if (sortBy === 'lookups') return (b.lookup_count || 1) - (a.lookup_count || 1);
      return parseInt(b.id, 10) - parseInt(a.id, 10); // newest
    });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            Total Words
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 block">
            {stats.total}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider block">
            New
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
            {stats.new}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider block">
            Learning
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 mt-1 block">
            {stats.learning}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
          <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block">
            Learned
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {stats.learned}
          </span>
        </div>
      </div>

      {/* Action Bar: Flashcards, Quiz, Export, Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/revise/flashcards"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20"
          >
            <Layers className="w-4 h-4" />
            <span>Practice Flashcards</span>
          </Link>

          <Link
            href="/revise/quiz"
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium px-4 py-2 rounded-xl text-sm transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <span>Take Quiz</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            title="Download CSV"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleRefresh}
            title="Sync / Refresh"
            disabled={isRefreshing}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search words, Hindi, or definitions..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="learning">Learning</option>
            <option value="learned">Learned</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alpha">A to Z</option>
            <option value="lookups">Most Looked Up</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden">
        {filteredWords.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">
              No words match your filters
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Try a different search query or look up new words from the home page.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-all shadow-md shadow-indigo-600/20"
            >
              Look up a new word
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 uppercase tracking-wider text-xs">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-bold">Word</th>
                  <th scope="col" className="px-5 py-3.5 font-bold">हिंदी अनुवाद</th>
                  <th scope="col" className="px-5 py-3.5 font-bold hidden md:table-cell">English Meaning</th>
                  <th scope="col" className="px-5 py-3.5 font-bold hidden lg:table-cell">हिंदी में अर्थ</th>
                  <th scope="col" className="px-5 py-3.5 font-bold">Status</th>
                  <th scope="col" className="px-5 py-3.5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filteredWords.map((word) => (
                  <tr
                    key={word.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors"
                  >
                    {/* Word column */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-white capitalize">
                          {word.word}
                        </span>
                        <button
                          onClick={() => playPronunciation(word.word)}
                          title="Listen pronunciation"
                          className="p-1 rounded-full text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          {word.part_of_speech}
                        </span>
                        {word.lookup_count > 1 && (
                          <span className="text-[10px] text-slate-400">
                            • {word.lookup_count} views
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Hindi Translation */}
                    <td className="px-5 py-4 font-devanagari font-bold text-base text-slate-900 dark:text-slate-100">
                      {word.hindi_translation}
                    </td>

                    {/* English Meaning */}
                    <td className="px-5 py-4 hidden md:table-cell text-slate-600 dark:text-slate-300 max-w-xs truncate">
                      {word.english_meaning}
                    </td>

                    {/* Hindi Meaning */}
                    <td className="px-5 py-4 hidden lg:table-cell font-devanagari text-slate-700 dark:text-slate-300 max-w-xs truncate">
                      {word.hindi_meaning}
                    </td>

                    {/* Status Pill Toggle */}
                    <td className="px-5 py-4">
                      <select
                        value={word.status}
                        onChange={(e) => handleStatusChange(word.id, e.target.value as WordStatus)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none transition-colors ${
                          word.status === 'learned'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                            : word.status === 'learning'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800'
                        }`}
                      >
                        <option value="new">New</option>
                        <option value="learning">Learning</option>
                        <option value="learned">Learned</option>
                      </select>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleDelete(word.id, word.word)}
                        disabled={deletingId === word.id}
                        title="Delete word"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
