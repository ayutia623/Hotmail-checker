'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, AlertCircle, XCircle } from 'lucide-react';
import axios from 'axios';

import InputForm from '@/components/InputForm';
import StatsDisplay from '@/components/StatsDisplay';
import HitViewer from '@/components/HitViewer';
import ResultsTable from '@/components/ResultsTable';

import type {
  Account,
  CheckerConfig,
  CheckResult,
  LiveStats,
  CheckResponse,
} from '@/lib/types';
import { getErrorMessage } from '@/lib/utils';

export default function HomePage() {
  // State management
  const [isChecking, setIsChecking] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [stats, setStats] = useState<LiveStats>({
    total: 0,
    checked: 0,
    hits: 0,
    fails: 0,
    pending: 0,
    progress: 0,
    startTime: new Date(),
  });
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hits' | 'all'>('hits');

  // Polling interval ref
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start checking process
  const handleStartCheck = async (accounts: Account[], config: CheckerConfig) => {
    try {
      setError(null);
      setIsChecking(true);
      setResults([]);
      setStats({
        total: accounts.length,
        checked: 0,
        hits: 0,
        fails: 0,
        pending: accounts.length,
        progress: 0,
        startTime: new Date(),
      });

      // Start check via API
      const response = await axios.post<CheckResponse>('/api/check', {
        accounts,
        config,
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Failed to start checking');
      }

      const { sessionId: newSessionId, stats: initialStats } = response.data;

      if (!newSessionId) {
        throw new Error('No session ID received');
      }

      setSessionId(newSessionId);
      if (initialStats) {
        setStats(initialStats);
      }

      // Start polling for progress
      startPolling(newSessionId);
    } catch (error) {
      console.error('Failed to start check:', error);
      setError(getErrorMessage(error));
      setIsChecking(false);
    }
  };

  // Start polling for progress updates
  const startPolling = useCallback((sid: string) => {
    // Clear existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll every 1 second
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get<CheckResponse>(`/api/check?sessionId=${sid}`);

        if (response.data.success) {
          const { results: newResults, stats: newStats } = response.data;

          if (newResults) {
            setResults(newResults);
          }

          if (newStats) {
            setStats(newStats);

            // Stop polling if complete
            if (newStats.progress >= 100) {
              stopPolling();
              setIsChecking(false);
            }
          }
        }
      } catch (error) {
        console.error('Polling error:', error);
        // Don't stop on single error, continue polling
      }
    }, 1000);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // Cancel checking
  const handleCancelCheck = async () => {
    if (!sessionId) return;

    try {
      await axios.delete(`/api/check?sessionId=${sessionId}`);
      stopPolling();
      setIsChecking(false);
      setSessionId(null);
    } catch (error) {
      console.error('Failed to cancel check:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-glow"
              >
                <Shield className="w-8 h-8 text-white" />
              </motion.div>
              <div>
                <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Hotmail Inbox Checker
                </h1>
                <p className="text-slate-400 mt-1">
                  Multi-checking with keyword search & proxy support
                </p>
              </div>
            </div>

            {isChecking && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCancelCheck}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-glow-danger"
              >
                <XCircle className="w-5 h-5" />
                Cancel
              </motion.button>
            )}
          </div>

          {/* Info Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"
          >
            <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <span className="font-semibold">Fast & Secure:</span> Check multiple Hotmail/Outlook
              accounts simultaneously with keyword filtering, full inbox capture, and optional proxy
              rotation.
            </div>
          </motion.div>
        </motion.header>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-red-300 mb-1">Error</div>
              <div className="text-sm text-red-400">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-1">
            <InputForm onStartCheck={handleStartCheck} isChecking={isChecking} />
          </div>

          {/* Right Column: Stats & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Display */}
            <StatsDisplay stats={stats} isActive={isChecking} />

            {/* Results Section */}
            {results.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Tab Selector */}
                <div className="flex items-center gap-2 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50 w-fit">
                  <button
                    onClick={() => setActiveTab('hits')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'hits'
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-glow-success'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Hits ({results.filter((r) => r.isHit).length})
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === 'all'
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-glow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All Results ({results.length})
                  </button>
                </div>

                {/* Content Based on Active Tab */}
                {activeTab === 'hits' ? (
                  <HitViewer results={results} />
                ) : (
                  <ResultsTable results={results} />
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center text-slate-500 text-sm"
        >
          <p>
            Built with Next.js 14, TypeScript, Tailwind CSS, and Framer Motion
          </p>
          <p className="mt-1">
            ⚠️ For educational purposes only. Use responsibly.
          </p>
        </motion.footer>
      </div>
    </div>
  );
}
