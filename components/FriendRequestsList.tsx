import React, { useState } from 'react';
import { FriendRequest } from '../types';
import { friendsService } from '../services/friendsService';
import { Button } from './Button';
import { Clock, Check, X } from 'lucide-react';

interface FriendRequestsListProps {
  requests: FriendRequest[];
  currentUserId: string;
}

export const FriendRequestsList: React.FC<FriendRequestsListProps> = ({
  requests,
  currentUserId
}) => {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAccept = async (requesterId: string, requesterName: string) => {
    setProcessing(requesterId);
    try {
      await friendsService.acceptFriendRequest(currentUserId, requesterId);
    } catch (error) {
      console.error('Failed to accept request:', error);
      alert(`Failed to accept friend request from ${requesterName}. Please try again.`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requesterId: string, requesterName: string) => {
    if (!confirm(`Are you sure you want to reject the friend request from ${requesterName}?`)) return;

    setProcessing(requesterId);
    try {
      await friendsService.rejectFriendRequest(currentUserId, requesterId);
    } catch (error) {
      console.error('Failed to reject request:', error);
      alert('Failed to reject friend request. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg font-semibold">No pending requests</p>
        <p className="text-sm">Friend requests you receive will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <div
          key={request.friendId}
          className="border border-purple-200 bg-purple-50 rounded-lg p-4"
        >
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {request.photoURL ? (
              <img
                src={request.photoURL}
                alt={request.displayName}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-lg">
                {request.displayName[0].toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{request.displayName}</h3>
              <p className="text-sm text-gray-600">
                Code: <span className="font-mono">{request.friendCode}</span>
              </p>
              <p className="text-xs text-gray-500">
                Sent {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="primary"
                onClick={() => handleAccept(request.friendId, request.displayName)}
                disabled={processing === request.friendId}
                className="text-sm py-2 px-3"
              >
                <Check className="w-4 h-4 mr-1" /> Accept
              </Button>
              <Button
                variant="danger"
                onClick={() => handleReject(request.friendId, request.displayName)}
                disabled={processing === request.friendId}
                className="text-sm py-2 px-3"
              >
                <X className="w-4 h-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
