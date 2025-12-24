import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Copy, Check } from 'lucide-react';
import { User, Friend, FriendRequest } from '../types';
import { friendsService } from '../services/friendsService';
import { getUserProfile } from '../services/firestoreService';
import { FriendsList } from './FriendsList';
import { FriendRequestsList } from './FriendRequestsList';
import { AddFriendPanel } from './AddFriendPanel';

interface FriendsModalProps {
  user: User;
  onClose: () => void;
  onInviteToGame?: (friendId: string) => void;
}

type TabMode = 'friends' | 'requests' | 'add';

export const FriendsModal: React.FC<FriendsModalProps> = ({
  user,
  onClose,
  onInviteToGame
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendCode, setFriendCode] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Load user's friend code and generate if missing
  useEffect(() => {
    async function loadUserProfile() {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        // If user doesn't have a friend code yet, generate one
        if (!profile.friendCode) {
          const newCode = await friendsService.generateUniqueFriendCode();
          // Update user profile in Firestore
          const { doc, updateDoc } = await import('firebase/firestore');
          const { db } = await import('../firebase.config');
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, { friendCode: newCode });
          setFriendCode(newCode);
        } else {
          setFriendCode(profile.friendCode);
        }
      }
    }
    loadUserProfile();
  }, [user.uid]);

  // Real-time subscription to friends and requests
  useEffect(() => {
    const unsubFriends = friendsService.subscribeToFriends(user.uid, setFriends);
    const unsubRequests = friendsService.subscribeToFriendRequests(user.uid, setPendingRequests);
    setLoading(false);

    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [user.uid]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 p-6 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Users className="w-8 h-8 mr-3" />
              <div>
                <h2 className="text-2xl font-bold">Friends</h2>
                <p className="text-purple-100 text-sm flex items-center gap-2">
                  Your code: <span className="font-mono font-bold">{friendCode || '...'}</span>
                  {friendCode && (
                    <button
                      onClick={handleCopyCode}
                      className="ml-1 hover:text-white transition-colors"
                      title="Copy friend code"
                    >
                      {copiedCode ? <Check className="w-4 h-4 inline" /> : <Copy className="w-4 h-4 inline" />}
                    </button>
                  )}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 px-4 font-semibold transition ${
              activeTab === 'friends'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Friends ({friends.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 px-4 font-semibold transition relative ${
              activeTab === 'requests'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 px-4 font-semibold transition ${
              activeTab === 'add'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <UserPlus className="w-4 h-4 inline mr-1" /> Add Friend
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600 mx-auto mb-4"></div>
              <p>Loading...</p>
            </div>
          ) : (
            <>
              {activeTab === 'friends' && (
                <FriendsList
                  friends={friends}
                  currentUserId={user.uid}
                  onInviteToGame={onInviteToGame}
                />
              )}
              {activeTab === 'requests' && (
                <FriendRequestsList
                  requests={pendingRequests}
                  currentUserId={user.uid}
                />
              )}
              {activeTab === 'add' && (
                <AddFriendPanel currentUserId={user.uid} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
