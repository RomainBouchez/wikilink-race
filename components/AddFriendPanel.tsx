import React, { useState } from 'react';
import { friendsService } from '../services/friendsService';
import { Button } from './Button';
import { UserPlus } from 'lucide-react';

interface AddFriendPanelProps {
  currentUserId: string;
}

export const AddFriendPanel: React.FC<AddFriendPanelProps> = ({ currentUserId }) => {
  const [friendCode, setFriendCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (friendCode.length !== 6) {
      setError('Friend code must be 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await friendsService.sendFriendRequest(currentUserId, friendCode.toUpperCase());
      setSuccess('Friend request sent successfully!');
      setFriendCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">How to add friends</h3>
        <p className="text-sm text-blue-700">
          Ask your friend for their 6-character friend code and enter it below. They'll receive a friend request that they can accept.
        </p>
      </div>

      <form onSubmit={handleAddFriend} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Friend Code
          </label>
          <input
            type="text"
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ABC123"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-center text-2xl font-mono tracking-widest uppercase"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {success}
          </div>
        )}

        <Button
          type="submit"
          isLoading={loading}
          disabled={friendCode.length !== 6}
          className="w-full"
        >
          <UserPlus className="w-5 h-5 mr-2" /> Send Friend Request
        </Button>
      </form>
    </div>
  );
};
