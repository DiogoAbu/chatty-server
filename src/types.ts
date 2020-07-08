import { Permission } from 'accesscontrol';
import { Request } from 'express';

export type MyRequest = Request;

export interface Payload {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __uuid: string;
  id: string;
}

export interface MyContext {
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
  read_receipts: SyncTableChangeSet<{ [key: string]: any }>;
  rooms: SyncTableChangeSet<{ [key: string]: any }>;
  users: SyncTableChangeSet<{ [key: string]: any }>;
  room_members: SyncTableChangeSet<{ id: string; user_id: string; room_id: string }>;
};
