export type UserStatus = 'online' | 'offline' | 'away';

export interface UserPresence {
  status: UserStatus;
  lastSeen: string;
}

// Helper type for the presence hook return value
export interface UsePresence {
  status: UserStatus;
  updateStatus: (status: UserStatus) => Promise<void>;
  error: Error | null;
} 