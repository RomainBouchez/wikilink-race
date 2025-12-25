import React, { useState, useEffect } from 'react';
import { X, Home } from 'lucide-react';
import { User, UserProfile, EnhancedUserStats, GameEntry, GraphData } from '../types';
import { getUserProfile } from '../services/firestoreService';
import { statsService } from '../services/statsService';
import { graphDataService } from '../services/graphDataService';
import { getUserGames } from '../services/firestoreService';
import { ProfileHeader } from './ProfileHeader';
import { DailyStreaksCard } from './DailyStreaksCard';
import { ProfileStatsCards } from './ProfileStatsCards';
import { ProfileRecentGames } from './ProfileRecentGames';
import { PathGraphVisualization } from './PathGraphVisualization';

interface ProfilePageProps {
  user: User;
  onClose: () => void;
}

type TabMode = 'overview' | 'games' | 'graph';

export const ProfilePage: React.FC<ProfilePageProps> = ({ user, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [enhancedStats, setEnhancedStats] = useState<EnhancedUserStats | null>(null);
  const [recentGames, setRecentGames] = useState<GameEntry[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabMode>('overview');

  useEffect(() => {
    async function loadProfileData() {
      try {
        setLoading(true);
        setError(null);

        // Load all data in parallel
        const [profileData, stats, games, graph] = await Promise.all([
          getUserProfile(user.uid).catch(err => {
            console.error('Error loading profile:', err);
            return null;
          }),
          statsService.getEnhancedStats(user.uid).catch(err => {
            console.error('Error loading enhanced stats:', err);
            return null;
          }),
          getUserGames(user.uid, 20).catch(err => {
            console.error('Error loading games:', err);
            return [];
          }),
          graphDataService.buildUserGraph(user.uid, 50, 100).catch(err => {
            console.error('Error loading graph:', err);
            return { nodes: [], links: [] };
          })
        ]);

        setProfile(profileData);
        setEnhancedStats(stats);
        setRecentGames(games);
        setGraphData(graph);

        if (!profileData) {
          setError('Failed to load profile data. Please check console for details.');
        }
      } catch (error) {
        console.error('Failed to load profile data:', error);
        setError('An unexpected error occurred while loading your profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfileData();
  }, [user.uid]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 to-indigo-800 z-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6 min-h-screen">
        {/* Home Button - Responsive */}
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-all font-semibold backdrop-blur-sm"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Home</span>
          </button>

          {/* Close X button for mobile */}
          <button
            onClick={onClose}
            className="sm:hidden text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading your profile...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md text-center">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Profile</h2>
              <p className="text-gray-700 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                Check the browser console (F12) for more details.
              </p>
              <button
                onClick={onClose}
                className="mt-6 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Profile Header */}
            {profile && <ProfileHeader user={user} profile={profile} />}

            {!profile && (
              <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 text-center">
                <p className="text-gray-700">Profile data not available. Check console for errors.</p>
              </div>
            )}

            {/* Tab Navigation - Responsive */}
            <div className="flex gap-1 sm:gap-2 mb-6 bg-white bg-opacity-10 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition ${
                  activeTab === 'overview'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('games')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition ${
                  activeTab === 'games'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <span className="hidden sm:inline">Recent </span>Games
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-lg font-semibold text-sm sm:text-base transition ${
                  activeTab === 'graph'
                    ? 'bg-white text-purple-600 shadow-lg'
                    : 'text-white hover:bg-white hover:bg-opacity-20'
                }`}
              >
                <span className="hidden sm:inline">Path </span>Graph
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {enhancedStats ? (
                  <>
                    <DailyStreaksCard streak={enhancedStats.dailyStreak} />
                    <ProfileStatsCards stats={enhancedStats} />
                  </>
                ) : (
                  <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
                    <p className="text-gray-700">Stats data not available. Check console for errors.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'games' && (
              <ProfileRecentGames games={recentGames} />
            )}

            {activeTab === 'graph' && (
              <PathGraphVisualization data={graphData || { nodes: [], links: [] }} />
            )}
          </>
        )}
      </div>
    </div>
  );
};
