import { Permission } from 'accesscontrol';
import { Request } from 'express';

import User from '!/entities/User';

export type MyRequest = Request;

export interface Payload {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __uuid: string;
  id: string;
}

export interface MyContext {
  user: User | null;
  permissions: Permission[];
}

//////////
// Sync //
//////////
export type RecordId = string;

export type DirtyRaw<T> = Partial<T>;

export type SyncTableChangeSet<T> = {
  created?: DirtyRaw<T>[];
  updated: DirtyRaw<T>[];
  deleted: RecordId[];
};
export type SyncDatabaseChangeSet<T> = { [table: string]: SyncTableChangeSet<T> };

export type SyncPullResult<T> = { changes: SyncDatabaseChangeSet<T>; timestamp: number };
