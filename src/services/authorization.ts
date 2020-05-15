import { AccessControl } from 'accesscontrol';
import { AuthChecker } from 'type-graphql';

import { MyContext } from '../types';

/**
 * In the example below a Guest can create an Account setting all it's properties, but the role.
 * // Role
 * guest: {
 *   // Resource
 *   account: {
 *     // Action : Possession
 *     'create:any': ['*', '!role'],
 */
const grants = {
  admin: {
    account: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    room: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
    message: {
      'create:any': ['*'],
      'read:any': ['*'],
      'update:any': ['*'],
      'delete:any': ['*'],
    },
  },
  user: {
    account: {
      'create:own': ['*', '!role'],
      'read:own': ['*', '!password'],
      'update:own': ['*', '!role'],
      'delete:own': ['*'],
    },
    room: {
      'create:own': ['*'],
      'read:own': ['*'],
      'update:own': ['*'],
      'delete:own': ['*'],
    },
    message: {
      'create:own': ['*'],
      'read:own': ['*'],
      'update:own': ['*'],
      'delete:own': ['*'],
    },
  },
};

export const ac = new AccessControl(grants).lock();

export const ROLES = ac.getRoles();

/**
 * Check if user is signed-in, then check if has permission for the actions and resource passed.
 */
export const authChecker: AuthChecker<MyContext, string> = ({ context }, roles) => {
  const { user } = context;

  // Not signed-in
  if (!user) {
    return false;
  }

  // No permission to check
  if (!roles?.length) {
    return true;
  }

  // Check for each role passed
  for (const role of roles) {
    const [action, possession, resource] = role.split(':');

    // Check role against user's
    const permission = ac.permission({
      role: user.role,
      action: `${action}:${possession}`,
      resource,
    });

    // No permission match
    if (!permission) {
      return false;
    }

    // Permission denied
    if (!permission.granted) {
      return false;
    }

    // Store permission to filter data later
    context.permissions.push(permission);
  }

  return true;
};
