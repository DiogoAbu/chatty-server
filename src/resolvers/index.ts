import { DeviceResolver } from './device';
import { MessageResolver } from './message';
import { RoomResolver } from './room';
import { SyncResolver } from './sync';
import { UserResolver } from './user';

export default [UserResolver, RoomResolver, MessageResolver, SyncResolver, DeviceResolver] as [
  Function,
  ...Function[]
];
