import React, { useEffect, useState } from 'react';
import { GameMode } from '../types';
import { Button } from './Button';
import { Calendar, Dumbbell, Trophy, Clock } from 'lucide-react';
import { dailyChallengeService } from '../services/dailyChallengeService';

interface ModeSelectionProps {
  onSelectMode: (mode: GameMode) => void;
  onViewLeaderboard: () => void;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelectMode, onViewLeaderboard }) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [hasCompletedDaily, setHasCompletedDaily] = useState(false);

  useEffect(() => {
    setHasCompletedDaily(dailyChallengeService.hasCompletedToday());

    const updateTimer = () => {
      const time = dailyChallengeService.getTimeUntilNextChallenge();
      setTimeRemaining(time);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Daily Challenge Card */}
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-8 text-white shadow-xl hover:shadow-2xl transition-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <Calendar className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Daily Challenge</h2>
          </div>

          <p className="text-blue-100 mb-6 text-sm">
            Everyone plays the same challenge. Compete for the best score!
          </p>

          {hasCompletedDaily && (
            <div className="bg-green-500 bg-opacity-30 border border-green-300 rounded-lg p-3 mb-4 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              <span className="text-sm font-semibold">Completed Today!</span>
            </div>
          )}

          <div className="bg-white bg-opacity-20 rounded-lg p-3 mb-6 flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              <span className="text-xs font-semibold uppercase">Next Challenge</span>
            </div>
            <span className="font-mono text-sm">
              {String(timeRemaining.hours).padStart(2, '0')}:
              {String(timeRemaining.minutes).padStart(2, '0')}:
              {String(timeRemaining.seconds).padStart(2, '0')}
            </span>
          </div>

          <Button
            onClick={() => onSelectMode(GameMode.DAILY)}
            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold"
          >
            {hasCompletedDaily ? 'Play Again (Practice)' : 'Play Daily Challenge'}
          </Button>
        </div>
      </div>

      {/* Training Mode Card */}
      <div className="bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl p-8 text-white shadow-xl hover:shadow-2xl transition-shadow relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <Dumbbell className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Training Mode</h2>
          </div>

          <p className="text-gray-300 mb-6 text-sm">
            Practice with random challenges. Unlimited attempts, separate leaderboard.
          </p>

          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Random start and target pages</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Unlimited games</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Separate leaderboard</span>
              </li>
            </ul>
          </div>

          <Button
            onClick={() => onSelectMode(GameMode.TRAINING)}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 font-bold"
          >
            Start Training
          </Button>
        </div>
      </div>

      {/* Leaderboard Button - Spanning both columns */}
      <div className="md:col-span-2">
        <Button
          variant="secondary"
          onClick={onViewLeaderboard}
          className="w-full flex items-center justify-center text-lg py-4"
        >
          <Trophy className="w-5 h-5 mr-2" /> View Leaderboards
        </Button>
      </div>
    </div>
  );
};
