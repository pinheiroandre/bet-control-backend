// Um "resolver" é a função que efetivamente RESPONDE a cada campo definido no schema.
// Para cada query/mutation no typeDefs, deve existir um resolver correspondente aqui.
export const resolvers = {
  Query: {
    status: () => "Backend rodando com sucesso! 🚀",
    bookmakers: async (_parent: unknown, args: { identifier?: string }, context: any) => {
      return context.bookmakerService.findAll(args);
    },
  },
  Mutation: {
    createBookmaker: async (_parent: unknown, args: any, context: any) => {
      return context.bookmakerService.create(args.input);
    },
  },
};