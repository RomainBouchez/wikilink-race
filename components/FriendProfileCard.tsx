import React, { useState, useEffect } from 'react';
import { X, Trophy, Clock } from 'lucide-react';
import { getUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';
import { Button } from './Button';

interface FriendProfileCardProps {
  friendId: string;
  onClose: () => void;
}

export const FriendProfileCard: React.FC<FriendProfileCardProps> = ({
  friendId,
  onClose
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getUserProfile(friendId);
        setProfile(data);
      } catch (error) {
        console.error('Failed to load friend profile:', error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [friendId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
          <p className="text-center text-gray-600">Failed to load profile</p>
          <Button onClick={onClose} variant="secondary" className="w-full mt-4">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Profile Header */}
        <div className="text-center mb-6">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full mx-auto mb-4"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-3xl mx-auto mb-4">
              {profile.displayName[0].toUpperCase()}
            </div>
          )}
          <h2 className="text-2xl font-bold text-gray-900">{profile.displayName}</h2>
          <p className="text-gray-600">
            Code: <span className="font-mono">{profile.friendCode}</span>
          </p>
        </div>

        {/* Stats */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-purple-600" /> Game Statistics
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600">Total Games</div>
              <div className="text-2xl font-bold text-purple-600">
                {profile.stat.totalGames}
              </div>
            </div>

            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" /> Best Time
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {profile.stat.bestTime > 0 ? `${profile.stat.bestTime}s` : '-'}
              </div>
            </div>

            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" /> Avg Time
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {profile.stat.avgTime > 0 ? `${Math.round(profile.stat.avgTime)}s` : '-'}
              </div>
            </div>

            <div className="bg-white rounded p-3">
              <div className="text-sm text-gray-600">Member Since</div>
              <div className="text-sm font-semibold text-gray-900">
                {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        <Button onClick={onClose} variant="secondary" className="w-full mt-4">
          Close
        </Button>
      </div>
    </div>
  );
};
