import { ApolloServer } from 'apollo-server';
import { buildSchema, UnauthorizedError } from 'type-graphql';

import User from '!/entities/User';
import resolvers from '!/resolvers';
import { fromToken, getUserFromHeader } from '!/services/authentication';
import { authChecker } from '!/services/authorization';
import debug from '!/services/debug';
import sigkill from '!/services/sigkill';
import { MyContext } from '!/types';

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
    context: async ({ req, connection }): Promise<MyContext> => {
      // If using web socket
      if (connection) {
        return connection.context;
      }
      return {
        user: await getUserFromHeader(req),
        permissions: [],
      };
    },
    subscriptions: {
      onConnect: async (connectionParams: any) => {
        try {
          if (connectionParams.token) {
            // Get ID from token and User from ID
            const id = await fromToken(connectionParams.token);
            return {
              user: await User.findOne(id),
              permissions: [],
            };
          }
        } catch {
          //
        }

        // Nothing return, throw authentication error
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
