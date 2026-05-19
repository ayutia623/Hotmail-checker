'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Table,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
  Download,
  Search,
  ChevronUp,
  ChevronDown,
  Mail,
} from 'lucide-react';
import type { CheckResult } from '@/lib/types';
import { formatDate, formatDuration, exportToCSV, exportToJSON, downloadFile, cn } from '@/lib/utils';

interface ResultsTableProps {
  results: CheckResult[];
}

type SortField = 'email' | 'status' | 'matches' | 'duration' | 'timestamp';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'success' | 'failed' | 'hits';

export default function ResultsTable({ results }: ResultsTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort results
  const processedResults = useMemo(() => {
    let filtered = [...results];

    // Apply status filter
    if (filterStatus === 'success') {
      filtered = filtered.filter(r => r.status === 'success');
    } else if (filterStatus === 'failed') {
      filtered = filtered.filter(r => r.status === 'failed');
    } else if (filterStatus === 'hits') {
      filtered = filtered.filter(r => r.isHit);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.account.email.toLowerCase().includes(query) ||
        r.matches?.some(m => m.keyword.toLowerCase().includes(query))
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortField) {
        case 'email':
          compareA = a.account.email;
          compareB = b.account.email;
          break;
        case 'status':
          compareA = a.status;
          compareB = b.status;
          break;
        case 'matches':
          compareA = a.matches?.length || 0;
          compareB = b.matches?.length || 0;
          break;
        case 'duration':
          compareA = a.duration || 0;
          compareB = b.duration || 0;
          break;
        case 'timestamp':
          compareA = a.timestamp.getTime();
          compareB = b.timestamp.getTime();
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [results, sortField, sortDirection, filterStatus, searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleExportCSV = () => {
    const data = processedResults.map(r => ({
      email: r.account.email,
      status: r.status,
      isHit: r.isHit ? 'Yes' : 'No',
      matches: r.matches?.length || 0,
      keywords: r.matches?.map(m => m.keyword).join(', ') || '',
      duration: r.duration ? `${r.duration}ms` : '',
      error: r.error || '',
      timestamp: formatDate(r.timestamp),
    }));

    const csv = exportToCSV(data);
    downloadFile(csv, `results-${Date.now()}.csv`, 'text/csv');
  };

  const handleExportJSON = () => {
    const json = exportToJSON(processedResults);
    downloadFile(json, `results-${Date.now()}.json`, 'application/json');
  };

  const getStatusIcon = (result: CheckResult) => {
    if (result.isHit) {
      return <CheckCircle className="w-5 h-5 text-green-400" />;
    } else if (result.status === 'success') {
      return <CheckCircle className="w-5 h-5 text-blue-400" />;
    } else if (result.status === 'failed') {
      return <XCircle className="w-5 h-5 text-red-400" />;
    } else {
      return <Clock className="w-5 h-5 text-yellow-400" />;
    }
  };

  const getStatusBadge = (result: CheckResult) => {
    if (result.isHit) {
      return (
        <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded border border-green-500/30">
          HIT
        </span>
      );
    } else if (result.status === 'success') {
      return (
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded border border-blue-500/30">
          OK
        </span>
      );
    } else if (result.status === 'failed') {
      return (
        <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded border border-red-500/30">
          FAIL
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded border border-yellow-500/30">
          {result.status.toUpperCase()}
        </span>
      );
    }
  };

  if (results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-2xl p-12 border border-slate-700/30 text-center"
      >
        <div className="inline-flex p-4 rounded-full bg-slate-800/50 mb-4">
          <Table className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-semibold text-slate-300 mb-2">No Results Yet</h3>
        <p className="text-slate-500">
          Check results will appear here once checking starts
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Table className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Check Results</h2>
              <p className="text-sm text-slate-400">
                {processedResults.length} of {results.length} results
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Buttons */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm"
            >
              <Download className="w-4 h-4" />
              JSON
            </motion.button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mt-4 flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or keyword..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(['all', 'hits', 'success', 'failed'] as FilterStatus[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterStatus(filter)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  filterStatus === filter
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                )}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50 border-b border-slate-700/50">
            <tr>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Status
                  {sortField === 'status' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('email')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Email
                  {sortField === 'email' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('matches')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Matches
                  {sortField === 'matches' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('duration')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Duration
                  {sortField === 'duration' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </button>
              </th>
              <th className="px-6 py-3 text-left">
                <button
                  onClick={() => handleSort('timestamp')}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-white transition-colors"
                >
                  Time
                  {sortField === 'timestamp' && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      {sortDirection === 'asc' ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </motion.div>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            <AnimatePresence mode="popLayout">
              {processedResults.map((result, index) => (
                <motion.tr
                  key={result.account.email}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                  className={cn(
                    'hover:bg-slate-800/30 transition-colors',
                    result.isHit && 'bg-green-500/5'
                  )}
                >
                  {/* Status */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      {getStatusBadge(result)}
                    </div>
                  </td>

                  {/* Email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="font-mono text-sm text-white truncate max-w-xs">
                        {result.account.email}
                      </span>
                    </div>
                  </td>

                  {/* Matches */}
                  <td className="px-6 py-4">
                    {result.matches && result.matches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {result.matches.slice(0, 2).map((match, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded border border-blue-500/30"
                          >
                            {match.keyword}
                          </span>
                        ))}
                        {result.matches.length > 2 && (
                          <span className="px-2 py-1 bg-slate-700/50 text-slate-400 text-xs rounded">
                            +{result.matches.length - 2}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-slate-500">-</span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-300">
                      {result.duration ? formatDuration(result.duration) : '-'}
                    </span>
                  </td>

                  {/* Timestamp */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-400">
                      {formatDate(result.timestamp)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>

        {/* No Results After Filter */}
        {processedResults.length === 0 && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-12 text-center"
          >
            <Filter className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">No results match your filters</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
