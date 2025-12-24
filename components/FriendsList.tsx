import React, { useState } from 'react';
import { Friend } from '../types';
import { friendsService } from '../services/friendsService';
import { Button } from './Button';
import { User, Trash2, MessageCircle, Trophy } from 'lucide-react';
import { FriendProfileCard } from './FriendProfileCard';

interface FriendsListProps {
  friends: Friend[];
  currentUserId: string;
  onInviteToGame?: (friendId: string) => void;
}

export const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  currentUserId,
  onInviteToGame
}) => {
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [removingFriend, setRemovingFriend] = useState<string | null>(null);

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (!confirm(`Are you sure you want to remove ${friendName} from your friends?`)) return;

    setRemovingFriend(friendId);
    try {
      await friendsService.removeFriend(currentUserId, friendId);
    } catch (error) {
      console.error('Failed to remove friend:', error);
      alert('Failed to remove friend. Please try again.');
    } finally {
      setRemovingFriend(null);
    }
  };

  if (friends.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <User className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-semibold">No friends yet</p>
        <p className="text-sm">Add friends to compete and play together!</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {friends.map((friend) => (
          <div
            key={friend.uid}
            className="border rounded-lg p-4 hover:shadow-md transition-all bg-white"
          >
            <div className="flex items-center gap-4">
              {/* Avatar */}
              {friend.photoURL ? (
                <img
                  src={friend.photoURL}
                  alt={friend.displayName}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                  {friend.displayName[0].toUpperCase()}
                </div>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{friend.displayName}</h3>
                <p className="text-sm text-gray-600">
                  Code: <span className="font-mono">{friend.friendCode}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Friends since {new Date(friend.friendsSince).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap justify-end">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedFriend(friend.uid)}
                  className="text-sm py-2 px-3"
                >
                  <Trophy className="w-4 h-4 mr-1" /> Stats
                </Button>
                {onInviteToGame && (
                  <Button
                    variant="primary"
                    onClick={() => onInviteToGame(friend.uid)}
                    className="text-sm py-2 px-3"
                  >
                    <MessageCircle className="w-4 h-4 mr-1" /> Invite
                  </Button>
                )}
                <Button
                  variant="danger"
                  onClick={() => handleRemoveFriend(friend.uid, friend.displayName)}
                  disabled={removingFriend === friend.uid}
                  className="text-sm py-2 px-3"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Friend Profile Modal */}
      {selectedFriend && (
        <FriendProfileCard
          friendId={selectedFriend}
          onClose={() => setSelectedFriend(null)}
        />
      )}
    </>
  );
};
