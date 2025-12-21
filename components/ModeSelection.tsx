import React, { useEffect, useState } from 'react';
import { GameMode } from '../types';
import { Button } from './Button';
import { Calendar, Dumbbell, Trophy, Clock, Users } from 'lucide-react';
import { dailyChallengeService } from '../services/dailyChallengeService';

interface ModeSelectionProps {
  onSelectMode: (mode: GameMode, action?: 'create' | 'join') => void;
  onViewLeaderboard: () => void;
  user?: any;
  onShowAuthModal?: () => void;
}

export const ModeSelection: React.FC<ModeSelectionProps> = ({ onSelectMode, onViewLeaderboard, user, onShowAuthModal }) => {
  const [timeRemaining, setTimeRemaining] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [hasCompletedDaily, setHasCompletedDaily] = useState(false);

  useEffect(() => {
    setHasCompletedDaily(dailyChallengeService.hasCompletedToday());

    const updateTimer = () => {
      const time = dailyChallengeService.getTimeUntilNextChallenge();
      setTimeRemaining(time);

      // Reset completion status when midnight passes
      if (time.hours === 23 && time.minutes === 59 && time.seconds === 59) {
        setTimeout(() => {
          setHasCompletedDaily(dailyChallengeService.hasCompletedToday());
        }, 1000);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Daily Challenge Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-xl p-8 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <Calendar className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Daily Challenge</h2>
          </div>

          <p className="text-blue-100 mb-6 text-sm">
            Everyone plays the same challenge. Compete for the best score!
          </p>

          {hasCompletedDaily ? (
            <div className="bg-gradient-to-r from-green-400 to-emerald-500 bg-opacity-20 backdrop-blur-sm border-2 border-green-300 rounded-lg p-4 mb-4 shadow-md">
              <div className="flex items-center mb-2">
                <div className="bg-white bg-opacity-20 p-1.5 rounded-full mr-2">
                  <Trophy className="w-5 h-5 text-green-100" />
                </div>
                <span className="text-sm font-bold text-white">Completed Today!</span>
              </div>
              <p className="text-xs text-green-50 leading-relaxed">
                Come back tomorrow for a new challenge!
              </p>
            </div>
          ) : null}

          <div className="bg-white bg-opacity-20 backdrop-blur-sm rounded-lg p-3 mb-6 flex items-center justify-between border border-white border-opacity-30">
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-2 text-blue-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-100">Next Challenge</span>
            </div>
            <span className="font-mono text-base font-bold text-white">
              {String(timeRemaining.hours).padStart(2, '0')}:
              {String(timeRemaining.minutes).padStart(2, '0')}:
              {String(timeRemaining.seconds).padStart(2, '0')}
            </span>
          </div>

          <Button
            onClick={() => onSelectMode(GameMode.DAILY)}
            disabled={hasCompletedDaily}
            className="w-full bg-white !text-blue-600 hover:bg-blue-50 hover:!text-blue-700 font-bold py-3 text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:bg-white disabled:!text-blue-400"
          >
            {hasCompletedDaily ? 'Completed - Come Back Tomorrow' : 'Play Daily Challenge'}
          </Button>
        </div>
      </div>

      {/* Training Mode Card */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-xl p-8 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
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
            className="w-full bg-white !text-gray-900 hover:bg-gray-100 hover:!text-gray-900 font-bold py-3 text-base shadow-lg hover:shadow-xl transition-all"
          >
            Start Training
          </Button>
        </div>
      </div>

      {/* Multiplayer Mode Card */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-pink-800 rounded-xl p-8 text-white shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
        <div className="relative z-10">
          <div className="flex items-center mb-4">
            <Users className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Multiplayer</h2>
          </div>

          <p className="text-purple-100 mb-6 text-sm">
            Race against friends in real-time! Create or join a lobby.
          </p>

          <div className="bg-white bg-opacity-10 rounded-lg p-4 mb-6">
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>2-10 players per lobby</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Real-time competition</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>6-character room code</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (!user) {
                  onShowAuthModal?.();
                } else {
                  onSelectMode(GameMode.MULTIPLAYER, 'create');
                }
              }}
              className="flex-1 bg-white !text-purple-600 hover:bg-purple-50 hover:!text-purple-700 font-bold py-3 text-base shadow-lg hover:shadow-xl transition-all"
            >
              Create
            </Button>
            <Button
              onClick={() => {
                if (!user) {
                  onShowAuthModal?.();
                } else {
                  onSelectMode(GameMode.MULTIPLAYER, 'join');
                }
              }}
              className="flex-1 bg-white !text-purple-600 hover:bg-purple-50 hover:!text-purple-700 font-bold py-3 text-base shadow-lg hover:shadow-xl transition-all"
            >
              Join
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard Button - Spanning all three columns */}
      <div className="md:col-span-3">
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
