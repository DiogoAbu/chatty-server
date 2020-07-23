import gcm from 'node-gcm';

import Message from '!/entities/Message';
import Room from '!/entities/Room';
import debug from '!/services/debug';
import notEmpty from '!/utils/not-empty';

const log = debug.extend('push-notifications');

const { FCM_SERVER_KEY, FCM_PACKAGE_NAME } = process.env;

export type PushData = {
  title: string;
  senderId: string;
  messageId: string;
  roomId: string;
};

const defaultOptions: Partial<gcm.IMessageOptions> = {
  restrictedPackageName: FCM_PACKAGE_NAME,

  // Required for background/quit data-only messages on iOS
  contentAvailable: true,

  // Required for background/quit data-only messages on Android
  priority: 'high',
};

export function sendPush(
  senderId: string,
  title: string,
  message: Message,
  roomWithMembersAndDevices: Room,
): void {
  // Get device token of members, excluding the sender
  const tokens = roomWithMembersAndDevices.members
    .map((user) => {
      return user.devices.map((device) => {
        // if (user.id === senderId) {
        //   return null;
        // }
        if (device.platform === 'android') {
          return device.token;
        }
        return null;
      });
    })
    .reduce((prev, curr) => (curr || []).concat(...(prev || [])), [])
    .filter(notEmpty);

  // Send notification
  if (!tokens?.length) {
    log('Sending notification skipped, no token');
    return;
  }

  log('Sending notification for %s members', tokens.length);

  const data: PushData = {
    title,
    senderId,
    messageId: message.id,
    roomId: roomWithMembersAndDevices.id,
  };

  const options = {
    collapseKey: roomWithMembersAndDevices.id,
    data,
  };

  sendAndroid(options, tokens, (err) => {
    if (err) {
      log('Sending notification error', JSON.stringify(err, null, 2));
    }
  });
}

function sendAndroid(
  options: Partial<gcm.IMessageOptions>,
  registrationTokens: string[],
  callback: (err: any, resJson: gcm.IResponseBody) => void,
): void {
  const sender = new gcm.Sender(FCM_SERVER_KEY!);
  const message = new gcm.Message({ ...defaultOptions, ...options });

  sender.send(message, { registrationTokens }, callback);
}
