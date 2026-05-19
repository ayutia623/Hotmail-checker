'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Upload,
  FileText,
  Search,
  Settings,
  Globe,
  Zap,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';
import { parseComboList, parseProxyList as parseProxyListUtil } from '@/lib/utils';
import type { Account, ProxyConfig, CheckerConfig } from '@/lib/types';
import { cn } from '@/lib/utils';

interface InputFormProps {
  onStartCheck: (accounts: Account[], config: CheckerConfig) => void;
  isChecking: boolean;
}

export default function InputForm({ onStartCheck, isChecking }: InputFormProps) {
  const [comboText, setComboText] = useState('');
  const [keywords, setKeywords] = useState('');
  const [proxyText, setProxyText] = useState('');
  const [useProxy, setUseProxy] = useState(false);
  const [captureFullInbox, setCaptureFullInbox] = useState(true);
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [maxMessagesToCapture, setMaxMessagesToCapture] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setComboText(text);

      const result = parseComboList(text);
      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: `Loaded ${result.validLines} valid accounts (${result.invalidLines} invalid)`,
        });
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Failed to parse file',
        });
      }
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: 'Failed to read file',
      });
    }
  };

  // Handle start checking
  const handleStartCheck = () => {
    // Validate inputs
    if (!comboText.trim()) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter or upload account list',
      });
      return;
    }

    if (!keywords.trim()) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter at least one keyword',
      });
      return;
    }

    // Parse accounts
    const accountResult = parseComboList(comboText);
    if (!accountResult.success || !accountResult.accounts) {
      setUploadStatus({
        type: 'error',
        message: accountResult.error || 'Invalid account format',
      });
      return;
    }

    // Parse keywords
    const keywordList = keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keywordList.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter at least one keyword',
      });
      return;
    }

    // Parse proxies if enabled
    let proxyList: ProxyConfig[] = [];
    if (useProxy && proxyText.trim()) {
      proxyList = parseProxyListUtil(proxyText);
      if (proxyList.length === 0) {
        setUploadStatus({
          type: 'error',
          message: 'No valid proxies found',
        });
        return;
      }
    }

    // Build config
    const config: CheckerConfig = {
      keywords: keywordList,
      searchIn: ['subject', 'body', 'from'],
      maxConcurrent,
      timeout: 30000,
      useProxy,
      proxyList,
      proxyRotation: 'random',
      captureFullInbox,
      maxMessagesToCapture,
      retryOnFail: true,
      maxRetries: 2,
      delayBetweenChecks: 1000,
    };

    // Clear status and start
    setUploadStatus({ type: null, message: '' });
    onStartCheck(accountResult.accounts, config);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-2xl p-6 shadow-glass border border-slate-700/50"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/20 rounded-lg">
          <Settings className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Checker Configuration</h2>
          <p className="text-sm text-slate-400">Setup your checking parameters</p>
        </div>
      </div>

      {/* Status Message */}
      {uploadStatus.type && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'mb-4 p-4 rounded-lg flex items-start gap-3',
            uploadStatus.type === 'success' && 'bg-green-500/10 border border-green-500/30',
            uploadStatus.type === 'error' && 'bg-red-500/10 border border-red-500/30',
            uploadStatus.type === 'info' && 'bg-blue-500/10 border border-blue-500/30'
          )}
        >
          {uploadStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />}
          {uploadStatus.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />}
          {uploadStatus.type === 'info' && <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />}
          <div className="flex-1">
            <p className={cn(
              'text-sm',
              uploadStatus.type === 'success' && 'text-green-300',
              uploadStatus.type === 'error' && 'text-red-300',
              uploadStatus.type === 'info' && 'text-blue-300'
            )}>
              {uploadStatus.message}
            </p>
          </div>
          <button
            onClick={() => setUploadStatus({ type: null, message: '' })}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Combo List Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Account List (email:password)
        </label>
        <div className="space-y-2">
          <textarea
            value={comboText}
            onChange={(e) => setComboText(e.target.value)}
            placeholder="email@hotmail.com:password&#10;user@outlook.com:pass123&#10;..."
            className="w-full h-32 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            disabled={isChecking}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <span className="text-xs text-slate-500">Format: email:password (one per line)</span>
          </div>
        </div>
      </div>

      {/* Keywords Input */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
          <Search className="w-4 h-4" />
          Search Keywords
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Riotgames, Roblox, Steam, Epic Games"
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          disabled={isChecking}
        />
        <p className="mt-1 text-xs text-slate-500">Separate multiple keywords with commas</p>
      </div>

      {/* Proxy Settings */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Globe className="w-4 h-4" />
            Proxy Support
          </label>
          <button
            onClick={() => setUseProxy(!useProxy)}
            disabled={isChecking}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              useProxy ? 'bg-blue-500' : 'bg-slate-700',
              isChecking && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                useProxy ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
        </div>

        {useProxy && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <textarea
              value={proxyText}
              onChange={(e) => setProxyText(e.target.value)}
              placeholder="host:port:user:pass&#10;proxy.example.com:8080&#10;..."
              className="w-full h-24 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              disabled={isChecking}
            />
            <p className="mt-1 text-xs text-slate-500">Format: host:port or host:port:user:pass</p>
          </motion.div>
        )}
      </div>

      {/* Advanced Settings Toggle */}
      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors mb-4"
      >
        <Settings className="w-4 h-4" />
        {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4 mb-6 p-4 bg-slate-900/30 rounded-lg border border-slate-700/50"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Max Concurrent */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Concurrent Checks
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxConcurrent}
                onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 5)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isChecking}
              />
            </div>

            {/* Max Messages */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Max Messages to Capture
              </label>
              <input
                type="number"
                min="10"
                max="200"
                value={maxMessagesToCapture}
                onChange={(e) => setMaxMessagesToCapture(parseInt(e.target.value) || 50)}
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isChecking}
              />
            </div>
          </div>

          {/* Capture Full Inbox */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              Capture Full Inbox Data
            </label>
            <button
              onClick={() => setCaptureFullInbox(!captureFullInbox)}
              disabled={isChecking}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                captureFullInbox ? 'bg-blue-500' : 'bg-slate-700',
                isChecking && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  captureFullInbox ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
          </div>
        </motion.div>
      )}

      {/* Start Button */}
      <motion.button
        onClick={handleStartCheck}
        disabled={isChecking}
        whileHover={{ scale: isChecking ? 1 : 1.02 }}
        whileTap={{ scale: isChecking ? 1 : 0.98 }}
        className={cn(
          'w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-lg',
          isChecking
            ? 'bg-slate-700 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-glow'
        )}
      >
        {isChecking ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <Zap className="w-5 h-5" />
            </motion.div>
            Checking in Progress...
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Start Checking
          </>
        )}
      </motion.button>
    </motion.div>
  );
}
