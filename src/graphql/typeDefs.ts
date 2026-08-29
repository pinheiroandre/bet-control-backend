// O "type Query" define quais informações podem ser PEDIDAS pelo frontend.
// Isso é só um teste inicial (Hello World) para validar que o servidor está de pé.
// As queries/mutations reais de lançamentos serão definidas junto com a modelagem.
export const typeDefs = `#graphql
  type Query {
    status: String
  }
`;
