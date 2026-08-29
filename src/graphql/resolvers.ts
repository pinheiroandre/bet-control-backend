// Um "resolver" é a função que efetivamente RESPONDE a cada campo definido no schema.
// Para cada query/mutation no typeDefs, deve existir um resolver correspondente aqui.
export const resolvers = {
  Query: {
    status: () => "Backend rodando com sucesso! 🚀",
  },
};
