import { Permission } from 'accesscontrol';

export interface AuthenticationPayload {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  __uuid: string;
  id: string;
}

export interface CustomContext {
  userId: string | null;
  permissions: Permission[];
}
