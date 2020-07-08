import gcm from 'node-gcm';

const { FCM_SERVER_KEY, FCM_PACKAGE_NAME } = process.env;

const defaultOptions: Partial<gcm.IMessageOptions> = {
  restrictedPackageName: FCM_PACKAGE_NAME,
};

export function sendMessage(
  options: Partial<gcm.IMessageOptions>,
  registrationTokens: string[],
  callback: (err: any, resJson: gcm.IResponseBody) => void,
): void {
  const sender = new gcm.Sender(FCM_SERVER_KEY!);
  const message = new gcm.Message({ ...defaultOptions, ...options });

  sender.send(message, { registrationTokens }, callback);
}
