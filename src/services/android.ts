import gcm from 'node-gcm';

const { FCM_SERVER_KEY, FCM_PACKAGE_NAME } = process.env;

export function sendMessage(
  options: Partial<gcm.IMessageOptions>,
  registrationTokens: string[],
  callback: (err: any, resJson: gcm.IResponseBody) => void,
) {
  const defaultOptions: Partial<gcm.IMessageOptions> = {
    restrictedPackageName: FCM_PACKAGE_NAME,
  };

  const message = new gcm.Message({ ...defaultOptions, ...options });

  const sender = new gcm.Sender(FCM_SERVER_KEY!);

  sender.send(message, { registrationTokens }, callback);
}
