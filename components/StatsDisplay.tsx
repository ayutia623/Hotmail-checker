'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle,
  XCircle,
  Target,
  Clock,
  TrendingUp,
  Zap,
  Loader,
} from 'lucide-react';
import type { LiveStats } from '@/lib/types';
import { formatDuration, cn } from '@/lib/utils';

interface StatsDisplayProps {
  stats: LiveStats;
  isActive: boolean;
}

export default function StatsDisplay({ stats, isActive }: StatsDisplayProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - stats.startTime.getTime();
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, stats.startTime]);

  // Calculate success rate
  const successRate = stats.checked > 0
    ? ((stats.checked - stats.fails) / stats.checked) * 100
    : 0;

  // Calculate hit rate
  const hitRate = stats.checked > 0
    ? (stats.hits / stats.checked) * 100
    : 0;

  const statCards = [
    {
      id: 'total',
      label: 'Total Accounts',
      value: stats.total,
      icon: Target,
      color: 'blue',
      bgGradient: 'from-blue-500/20 to-blue-600/10',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400',
      iconBg: 'bg-blue-500/20',
    },
    {
      id: 'checked',
      label: 'Checked',
      value: stats.checked,
      icon: Activity,
      color: 'purple',
      bgGradient: 'from-purple-500/20 to-purple-600/10',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-400',
      iconBg: 'bg-purple-500/20',
      animate: isActive,
    },
    {
      id: 'hits',
      label: 'Hits',
      value: stats.hits,
      icon: CheckCircle,
      color: 'green',
      bgGradient: 'from-green-500/20 to-green-600/10',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-400',
      iconBg: 'bg-green-500/20',
      highlight: stats.hits > 0,
    },
    {
      id: 'fails',
      label: 'Failed',
      value: stats.fails,
      icon: XCircle,
      color: 'red',
      bgGradient: 'from-red-500/20 to-red-600/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400',
      iconBg: 'bg-red-500/20',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AnimatePresence mode="wait">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className={cn(
                'relative overflow-hidden rounded-xl p-4 backdrop-blur-xl border transition-all',
                `bg-gradient-to-br ${stat.bgGradient}`,
                stat.borderColor,
                stat.highlight && 'shadow-glow-success animate-pulse-glow'
              )}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-white to-transparent" />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-2">
                  <div className={cn('p-2 rounded-lg', stat.iconBg)}>
                    <stat.icon className={cn('w-5 h-5', stat.textColor)} />
                  </div>
                  {stat.animate && isActive && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Loader className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  )}
                </div>

                <motion.div
                  key={stat.value}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-3xl font-bold text-white mb-1"
                >
                  {stat.value.toLocaleString()}
                </motion.div>

                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>

              {/* Shimmer Effect for Active Stats */}
              {stat.animate && isActive && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl rounded-xl p-6 border border-slate-700/50"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Progress</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {Math.round(stats.progress)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-3 bg-slate-900/50 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.progress}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
          
          {/* Shimmer Effect */}
          {isActive && stats.progress < 100 && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          )}
        </div>

        {/* Progress Details */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-slate-500 text-xs">Elapsed</div>
              <div className="text-white font-medium">{formatDuration(elapsedTime)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-slate-500 text-xs">Speed</div>
              <div className="text-white font-medium">
                {stats.checkRate?.toFixed(1) || '0'}/min
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-slate-500 text-xs">Success Rate</div>
              <div className="text-white font-medium">
                {successRate.toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-400" />
            <div>
              <div className="text-slate-500 text-xs">Hit Rate</div>
              <div className={cn(
                'font-medium',
                hitRate > 0 ? 'text-green-400' : 'text-white'
              )}>
                {hitRate.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* ETA */}
        {isActive && stats.estimatedTimeRemaining && stats.estimatedTimeRemaining > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between"
          >
            <span className="text-sm text-slate-400">Estimated Time Remaining</span>
            <span className="text-lg font-semibold text-blue-400">
              {formatDuration(stats.estimatedTimeRemaining * 1000)}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Status Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-6 p-4 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-xl rounded-xl border border-slate-700/30"
      >
        {isActive && stats.progress < 100 ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-3 h-3 rounded-full bg-green-500 shadow-glow-success"
            />
            <span className="text-sm font-medium text-green-400">
              Checking in Progress...
            </span>
          </>
        ) : stats.progress >= 100 ? (
          <>
            <CheckCircle className="w-5 h-5 text-green-400" />
            <span className="text-sm font-medium text-green-400">
              Checking Completed!
            </span>
          </>
        ) : (
          <>
            <div className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-sm font-medium text-slate-400">
              Ready to Start
            </span>
          </>
        )}
      </motion.div>

      {/* Quick Stats Summary */}
      {stats.checked > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-4"
        >
          <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className="text-2xl font-bold text-blue-400">
              {((stats.checked / stats.total) * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Completion</div>
          </div>

          <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className="text-2xl font-bold text-green-400">
              {successRate.toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">Success</div>
          </div>

          <div className="text-center p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
            <div className="text-2xl font-bold text-purple-400">
              {stats.pending}
            </div>
            <div className="text-xs text-slate-500 mt-1">Pending</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
