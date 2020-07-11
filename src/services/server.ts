import { ApolloServer } from 'apollo-server';
import { buildSchema, UnauthorizedError } from 'type-graphql';

import resolvers from '!/resolvers';
import { getUserFromHeader } from '!/services/authentication';
import { authChecker } from '!/services/authorization';
import debug from '!/services/debug';
import sigkill from '!/services/sigkill';
import { CustomContext } from '!/types';

const log = debug.extend('server');

export default async (): Promise<{ server: ApolloServer; url: string }> => {
  const schema = await buildSchema({
    resolvers: resolvers as any,
    authChecker,
    dateScalarMode: 'timestamp',
    nullableByDefault: true,
    validate: true,
    emitSchemaFile: true,
  });

  // Create GraphQL server
  const server = new ApolloServer({
    schema,
    cors: true,
    context: async ({ req, connection }): Promise<CustomContext> => {
      // If using web socket
      if (connection) {
        return connection.context;
      }
      return {
        userId: await getUserFromHeader(req.headers),
        permissions: [],
      };
    },
    subscriptions: {
      onConnect: async (connectionParams: any) => {
        try {
          if (connectionParams) {
            const userId = await getUserFromHeader(connectionParams);
            return {
              userId,
              permissions: [],
            };
          }
        } catch {
          //
        }

        // Nothing returned, throw authentication error
        throw new UnauthorizedError();
      },
    },
  });

  // Shutdown gracefully
  sigkill(async () => server.stop());

  // Start the server
  const { url } = await server.listen(process.env.PORT || 4000);

  log('live on %s', url);

  return { server, url };
};
