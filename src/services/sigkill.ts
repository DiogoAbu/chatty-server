import debug from '!/services/debug';

// The signals we want to handle, the SIGKILL signal (9) cannot be intercepted and handled
const signals = {
  SIGHUP: 1,
  SIGINT: 2,
  SIGTERM: 15,
} as {
  [key: string]: number;
};

const log = debug.extend('kill');

export default (stop: () => Promise<void>): void => {
  // Do any necessary shutdown logic for our application here
  const shutdown = async (signal: string, value: number): Promise<void> => {
    await stop();
    log(`server stopped by ${signal} with value ${value}`);
    process.exit(128 + value);
  };

  // Create a listener for each of the signals that we want to handle
  Object.keys(signals).forEach((signal) => {
    process.on(signal as any, () => {
      log(`process received a ${signal} signal`);
      void shutdown(signal, signals[signal]);
    });
  });
};
