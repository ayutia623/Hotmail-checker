'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Calendar,
  User,
  Search,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Tag,
  Inbox,
  CheckCircle,
} from 'lucide-react';
import type { CheckResult } from '@/lib/types';
import { formatDate, copyToClipboard, cn } from '@/lib/utils';

interface HitViewerProps {
  results: CheckResult[];
}

export default function HitViewer({ results }: HitViewerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter only hits
  const hits = results.filter(r => r.isHit);

  if (hits.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center"
      >
        <div className="inline-flex p-4 rounded-full bg-slate-800/50 mb-4">
          <Search className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-300 mb-2">No Hits Yet</h3>
        <p className="text-slate-500">
          Hits with matching keywords will appear here
        </p>
      </motion.div>
    );
  }

  const handleCopy = async (text: string, id: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleExport = (result: CheckResult) => {
    const data = {
      email: result.account.email,
      timestamp: result.timestamp,
      matches: result.matches,
      inboxCapture: result.inboxCapture,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hit-${result.account.email}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Mail className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Hits Found</h2>
            <p className="text-sm text-slate-400">{hits.length} accounts with matches</p>
          </div>
        </div>
      </div>

      {/* Hits List */}
      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {hits.map((result, index) => {
            const isExpanded = expandedId === result.account.email;
            const matchCount = result.matches?.reduce((sum, m) => sum + m.matchCount, 0) || 0;
            const uniqueKeywords = Array.from(new Set(result.matches?.map(m => m.keyword) || []));

            return (
              <motion.div
                key={result.account.email}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                layout
                className={cn(
                  'bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-xl border transition-all overflow-hidden',
                  isExpanded
                    ? 'border-green-500/50 shadow-glow-success'
                    : 'border-slate-700/50 hover:border-slate-600/50'
                )}
              >
                {/* Header - Always Visible */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : result.account.email)}
                  className="p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Email & Stats */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-green-500/20 rounded">
                          <User className="w-4 h-4 text-green-400" />
                        </div>
                        <span className="font-mono text-white font-medium truncate">
                          {result.account.email}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(result.account.email, result.account.email);
                          }}
                          className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                        >
                          {copiedId === result.account.email ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4 text-slate-400" />
                          )}
                        </motion.button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1 px-2 py-1 bg-green-500/10 rounded text-green-400 border border-green-500/20">
                          <Tag className="w-3 h-3" />
                          <span>{matchCount} matches</span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 rounded text-blue-400 border border-blue-500/20">
                          <Search className="w-3 h-3" />
                          <span>{uniqueKeywords.length} keywords</span>
                        </div>
                        {result.inboxCapture && (
                          <div className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 rounded text-purple-400 border border-purple-500/20">
                            <Inbox className="w-3 h-3" />
                            <span>{result.inboxCapture.totalMessages} messages</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions & Toggle */}
                    <div className="flex items-center gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExport(result);
                        }}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white"
                        title="Export data"
                      >
                        <Download className="w-4 h-4" />
                      </motion.button>

                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        className="p-2 bg-slate-700/30 rounded-lg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-slate-700/50"
                    >
                      <div className="p-4 space-y-4">
                        {/* Keyword Matches */}
                        {result.matches && result.matches.length > 0 && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                              <Search className="w-4 h-4 text-blue-400" />
                              Keyword Matches
                            </h4>
                            <div className="space-y-2">
                              {result.matches.map((match, idx) => (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded">
                                        {match.keyword}
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        in {match.matchedIn}
                                      </span>
                                    </div>
                                    <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded">
                                      {match.matchCount}x
                                    </span>
                                  </div>
                                  {match.context && (
                                    <div className="text-xs text-slate-400 font-mono bg-slate-950/50 p-2 rounded border border-slate-800">
                                      {match.context}
                                    </div>
                                  )}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inbox Capture */}
                        {result.inboxCapture && (
                          <div>
                            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                              <Inbox className="w-4 h-4 text-purple-400" />
                              Inbox Preview
                            </h4>
                            <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-700/30 space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Total Messages:</span>
                                <span className="text-white font-medium">
                                  {result.inboxCapture.totalMessages}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Captured:</span>
                                <span className="text-white font-medium">
                                  {result.inboxCapture.messages.length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Folders:</span>
                                <span className="text-white font-medium">
                                  {result.inboxCapture.folders.length}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400">Capture Time:</span>
                                <span className="text-white font-medium">
                                  {formatDate(result.inboxCapture.captureTime)}
                                </span>
                              </div>
                            </div>

                            {/* Recent Messages Preview */}
                            {result.inboxCapture.messages.length > 0 && (
                              <div className="mt-3 space-y-2">
                                <div className="text-xs text-slate-400 mb-2">Recent Messages:</div>
                                {result.inboxCapture.messages.slice(0, 3).map((msg, idx) => (
                                  <motion.div
                                    key={msg.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="p-2 bg-slate-950/50 rounded border border-slate-800 text-xs"
                                  >
                                    <div className="flex items-start gap-2 mb-1">
                                      <Mail className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white truncate">
                                          {msg.subject}
                                        </div>
                                        <div className="text-slate-500 truncate">{msg.from}</div>
                                      </div>
                                    </div>
                                    {msg.snippet && (
                                      <div className="text-slate-400 line-clamp-2 pl-5">
                                        {msg.snippet}
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                                {result.inboxCapture.messages.length > 3 && (
                                  <div className="text-xs text-slate-500 text-center">
                                    +{result.inboxCapture.messages.length - 3} more messages
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="pt-3 border-t border-slate-700/30">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(result.timestamp)}</span>
                            </div>
                            {result.duration && (
                              <span>{result.duration}ms</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

