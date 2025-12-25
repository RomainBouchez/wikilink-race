import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Friend, FriendRequest, FriendRequestStatus, FriendSearchResult, UserProfile } from '../types';

class FriendsService {

  // ===== FRIEND CODE GENERATION =====

  /**
   * Generate a unique 6-character friend code
   * Format: ABC123 (no confusing chars: 0/O, 1/I)
   */
  private generateFriendCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * Check if friend code already exists
   */
  async friendCodeExists(friendCode: string): Promise<boolean> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('friendCode', '==', friendCode), limit(1));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  /**
   * Generate unique friend code with retry mechanism
   */
  async generateUniqueFriendCode(): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.generateFriendCode();
      attempts++;
      if (attempts >= maxAttempts) {
        throw new Error('Failed to generate unique friend code');
      }
    } while (await this.friendCodeExists(code));

    return code;
  }

  // ===== FRIEND REQUEST MANAGEMENT =====

  /**
   * Send friend request by friend code
   */
  async sendFriendRequest(fromUserId: string, friendCode: string): Promise<void> {
    // 1. Search for user by friend code
    const targetUser = await this.searchUserByFriendCode(friendCode);

    if (!targetUser) {
      throw new Error('User not found with this friend code');
    }

    if (targetUser.uid === fromUserId) {
      throw new Error('You cannot add yourself as a friend');
    }

    // Check if already friends (but allow resending pending requests)
    const friendsRef = collection(db, 'users', fromUserId, 'friends');
    const existingDoc = await getDoc(doc(friendsRef, targetUser.uid));

    if (existingDoc.exists()) {
      const data = existingDoc.data();
      if (data.status === FriendRequestStatus.ACCEPTED) {
        throw new Error('Already friends with this user');
      }
      // If pending request exists, we'll just update it with new timestamp
    }

    // 2. Get sender's profile for denormalization
    const senderDoc = await getDoc(doc(db, 'users', fromUserId));
    if (!senderDoc.exists()) {
      throw new Error('Sender profile not found');
    }
    const senderData = senderDoc.data();

    // 3. Create bi-directional friend request docs
    const timestamp = serverTimestamp();

    // Doc in sender's friends subcollection
    const senderFriendDoc = doc(db, 'users', fromUserId, 'friends', targetUser.uid);
    await setDoc(senderFriendDoc, {
      friendId: targetUser.uid,
      displayName: targetUser.displayName,
      photoURL: targetUser.photoURL,
      friendCode: targetUser.friendCode,
      status: FriendRequestStatus.PENDING,
      requestedBy: fromUserId,
      createdAt: timestamp,
      acceptedAt: null
    });

    // Doc in receiver's friends subcollection
    const receiverFriendDoc = doc(db, 'users', targetUser.uid, 'friends', fromUserId);
    await setDoc(receiverFriendDoc, {
      friendId: fromUserId,
      displayName: senderData.displayName,
      photoURL: senderData.photoURL,
      friendCode: senderData.friendCode,
      status: FriendRequestStatus.PENDING,
      requestedBy: fromUserId,
      createdAt: timestamp,
      acceptedAt: null
    });
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(userId: string, requesterId: string): Promise<void> {
    const timestamp = serverTimestamp();

    // Update both docs to accepted status
    const userFriendDoc = doc(db, 'users', userId, 'friends', requesterId);
    const requesterFriendDoc = doc(db, 'users', requesterId, 'friends', userId);

    await Promise.all([
      updateDoc(userFriendDoc, {
        status: FriendRequestStatus.ACCEPTED,
        acceptedAt: timestamp
      }),
      updateDoc(requesterFriendDoc, {
        status: FriendRequestStatus.ACCEPTED,
        acceptedAt: timestamp
      })
    ]);
  }

  /**
   * Reject/cancel friend request
   */
  async rejectFriendRequest(userId: string, requesterId: string): Promise<void> {
    // Delete both docs
    const userFriendDoc = doc(db, 'users', userId, 'friends', requesterId);
    const requesterFriendDoc = doc(db, 'users', requesterId, 'friends', userId);

    await Promise.all([
      deleteDoc(userFriendDoc),
      deleteDoc(requesterFriendDoc)
    ]);
  }

  /**
   * Remove friend (unfriend)
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    // Same as reject, delete both docs
    await this.rejectFriendRequest(userId, friendId);
  }

  // ===== FRIEND QUERIES =====

  /**
   * Get all accepted friends for a user
   */
  async getFriends(userId: string): Promise<Friend[]> {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(
      friendsRef,
      where('status', '==', FriendRequestStatus.ACCEPTED),
      orderBy('acceptedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: data.friendId,
        displayName: data.displayName,
        photoURL: data.photoURL,
        friendCode: data.friendCode,
        friendsSince: data.acceptedAt?.toMillis() || Date.now()
      };
    });
  }

  /**
   * Get pending friend requests (incoming only)
   */
  async getPendingRequests(userId: string): Promise<FriendRequest[]> {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(
      friendsRef,
      where('status', '==', FriendRequestStatus.PENDING),
      where('requestedBy', '!=', userId),
      orderBy('requestedBy'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        friendId: data.friendId,
        displayName: data.displayName,
        photoURL: data.photoURL,
        friendCode: data.friendCode,
        status: data.status,
        requestedBy: data.requestedBy,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        acceptedAt: data.acceptedAt?.toMillis() || null
      };
    });
  }

  /**
   * Get outgoing pending requests
   */
  async getOutgoingRequests(userId: string): Promise<FriendRequest[]> {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(
      friendsRef,
      where('status', '==', FriendRequestStatus.PENDING),
      where('requestedBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        friendId: data.friendId,
        displayName: data.displayName,
        photoURL: data.photoURL,
        friendCode: data.friendCode,
        status: data.status,
        requestedBy: data.requestedBy,
        createdAt: data.createdAt?.toMillis() || Date.now(),
        acceptedAt: null
      };
    });
  }

  /**
   * Search user by friend code
   */
  async searchUserByFriendCode(friendCode: string): Promise<FriendSearchResult | null> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('friendCode', '==', friendCode.toUpperCase()), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    return {
      uid: userDoc.id,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      friendCode: userData.friendCode,
      isAlreadyFriend: false,  // Will be checked in component
      hasPendingRequest: false  // Will be checked in component
    };
  }

  /**
   * Get friend count
   */
  async getFriendCount(userId: string): Promise<number> {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(friendsRef, where('status', '==', FriendRequestStatus.ACCEPTED));
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  /**
   * Get pending request count
   */
  async getPendingRequestCount(userId: string): Promise<number> {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(
      friendsRef,
      where('status', '==', FriendRequestStatus.PENDING),
      where('requestedBy', '!=', userId),
      orderBy('requestedBy')
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  }

  // ===== REAL-TIME SUBSCRIPTIONS =====

  /**
   * Subscribe to friend requests (real-time updates)
   */
  subscribeToFriendRequests(
    userId: string,
    callback: (requests: FriendRequest[]) => void
  ): () => void {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(
      friendsRef,
      where('status', '==', FriendRequestStatus.PENDING),
      where('requestedBy', '!=', userId),
      orderBy('requestedBy'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          friendId: data.friendId,
          displayName: data.displayName,
          photoURL: data.photoURL,
          friendCode: data.friendCode,
          status: data.status,
          requestedBy: data.requestedBy,
          createdAt: data.createdAt?.toMillis() || Date.now(),
          acceptedAt: null
        };
      });
      callback(requests);
    });
  }

  /**
   * Subscribe to friends list (real-time updates)
   */
  subscribeToFriends(
    userId: string,
    callback: (friends: Friend[]) => void
  ): () => void {
    const friendsRef = collection(db, 'users', userId, 'friends');
    const q = query(
      friendsRef,
      where('status', '==', FriendRequestStatus.ACCEPTED),
      orderBy('acceptedAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const friends = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.friendId,
          displayName: data.displayName,
          photoURL: data.photoURL,
          friendCode: data.friendCode,
          friendsSince: data.acceptedAt?.toMillis() || Date.now()
        };
      });
      callback(friends);
    });
  }

  // ===== MULTIPLAYER INTEGRATION =====

  /**
   * Invite friend to multiplayer lobby
   * This is a placeholder - actual implementation depends on notification system
   */
  async inviteToMultiplayer(lobbyCode: string, friendId: string): Promise<void> {
    // Future: Could create a notifications subcollection
    // For now, user can copy lobby code and share manually
    // TODO: Implement notification system
  }
}

export const friendsService = new FriendsService();
