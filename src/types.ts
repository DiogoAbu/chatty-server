import { Permission } from 'accesscontrol';

export interface Payload {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __uuid: string;
  id: string;
}

export interface CustomContext {
  userId: string | null;
  permissions: Permission[];
}

//////////
// Sync //
//////////
type SyncTableChangeSet<T> = {
  created: Partial<T>[];
  updated: Partial<T>[];
  deleted: string[];
};

export type SyncChanges = {
  messages: SyncTableChangeSet<{ [key: string]: any }>;
  readReceipts: SyncTableChangeSet<{ [key: string]: any }>;
  rooms: SyncTableChangeSet<{ [key: string]: any }>;
  users: SyncTableChangeSet<{ [key: string]: any }>;
  roomMembers: SyncTableChangeSet<{ id: string; userId: string; roomId: string }>;
};
