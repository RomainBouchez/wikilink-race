import React from 'react';
import { Flame } from 'lucide-react';
import { DailyStreak } from '../types';

interface DailyStreaksCardProps {
  streak: DailyStreak;
}

export const DailyStreaksCard: React.FC<DailyStreaksCardProps> = ({ streak }) => {
  const hasActiveStreak = streak.currentStreak > 0;

  return (
    <div
      className={`rounded-2xl shadow-2xl p-8 relative overflow-hidden ${
        hasActiveStreak
          ? 'bg-gradient-to-br from-orange-500 to-red-500'
          : 'bg-gray-300'
      }`}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className={`text-2xl font-bold mb-1 ${hasActiveStreak ? 'text-white' : 'text-gray-600'}`}>
              Daily Streak
            </h2>
            <p className={`text-sm ${hasActiveStreak ? 'text-orange-100' : 'text-gray-500'}`}>
              Keep completing daily challenges!
            </p>
          </div>

          {/* Flame Icon */}
          <div className={`${hasActiveStreak ? 'animate-pulse' : 'opacity-50'}`}>
            <Flame
              className={`w-12 h-12 ${hasActiveStreak ? 'text-yellow-300' : 'text-gray-500'}`}
              fill={hasActiveStreak ? 'currentColor' : 'none'}
            />
          </div>
        </div>

        {/* Current Streak */}
        <div className="text-center py-6">
          {hasActiveStreak ? (
            <>
              <div className={`text-8xl font-bold mb-2 ${hasActiveStreak ? 'text-white' : 'text-gray-600'}`}>
                {streak.currentStreak}
              </div>
              <div className={`text-2xl font-semibold ${hasActiveStreak ? 'text-orange-100' : 'text-gray-500'}`}>
                {streak.currentStreak === 1 ? 'day in a row!' : 'days in a row!'}
              </div>
            </>
          ) : (
            <>
              <div className="text-6xl font-bold mb-2 text-gray-600">0</div>
              <div className="text-xl font-semibold text-gray-500">
                Start your streak today!
              </div>
            </>
          )}
        </div>

        {/* Best Streak Badge */}
        {streak.bestStreak > 0 && (
          <div className={`mt-4 text-center py-3 rounded-lg ${
            hasActiveStreak ? 'bg-white bg-opacity-20' : 'bg-gray-400 bg-opacity-50'
          }`}>
            <p className={`text-sm font-medium ${hasActiveStreak ? 'text-white' : 'text-gray-700'}`}>
              Best Streak: <span className="font-bold text-lg">{streak.bestStreak}</span> {streak.bestStreak === 1 ? 'day' : 'days'}
            </p>
          </div>
        )}

        {/* Last Completion */}
        {streak.lastCompletionDate && (
          <div className="mt-4 text-center">
            <p className={`text-xs ${hasActiveStreak ? 'text-orange-100' : 'text-gray-500'}`}>
              Last completed: {new Date(streak.lastCompletionDate).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
