import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { User, UserProfile } from '../types';

interface ProfileHeaderProps {
  user: User;
  profile: UserProfile;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, profile }) => {
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(profile.friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatMemberSince = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {profile.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-32 h-32 rounded-full border-4 border-purple-200"
            />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold text-5xl border-4 border-purple-200">
              {profile.displayName[0].toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {profile.displayName}
          </h1>

          <p className="text-gray-600 text-lg mb-4">
            {profile.isAnonymous ? 'Compte anonyme' : profile.email}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center md:items-start">
            {/* Friend Code */}
            <div className="bg-purple-50 rounded-lg px-4 py-2 inline-flex items-center gap-2">
              <span className="text-gray-600 text-sm">Friend Code:</span>
              <span className="font-mono font-bold text-purple-600 text-lg">
                {profile.friendCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="ml-2 text-purple-600 hover:text-purple-700 transition-colors"
                title="Copy friend code"
              >
                {copiedCode ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Member Since */}
            <div className="bg-gray-50 rounded-lg px-4 py-2 inline-flex items-center gap-2">
              <span className="text-gray-600 text-sm">Member since:</span>
              <span className="font-semibold text-gray-900">
                {formatMemberSince(profile.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
