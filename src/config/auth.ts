import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

// O Auth0 assina os tokens (JWT) com uma chave privada que só ele conhece.
// Para conferir se um token é válido, nosso backend precisa da chave pública
// correspondente — e é isso que o jwks-rsa busca automaticamente no Auth0.
//
// AUTH0_DOMAIN ainda não está configurado (faremos isso mais tarde).
// Por isso, montamos o client de forma "preguiçosa" (lazy) — ele só é
// criado de fato quando verifyToken() for chamada pela primeira vez,
// e não durante a inicialização do servidor. Assim o backend sobe
// normalmente mesmo sem o Auth0 configurado ainda.
let client: jwksClient.JwksClient | null = null;

function getClient(): jwksClient.JwksClient {
  if (!process.env.AUTH0_DOMAIN) {
    throw new Error(
      "AUTH0_DOMAIN não configurado no .env. Configure o Auth0 antes de validar tokens."
    );
  }
  if (!client) {
    client = jwksClient({
      jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
    });
  }
  return client;
}

function getSigningKey(header: jwt.JwtHeader, callback: jwt.SigningKeyCallback) {
  getClient().getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
}

// Recebe o token enviado pelo frontend (no header Authorization) e retorna
// os dados do usuário autenticado, ou lança erro se o token for inválido/expirado.
export function verifyToken(token: string): Promise<jwt.JwtPayload> {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        audience: process.env.AUTH0_AUDIENCE,
        issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err || !decoded) {
          reject(err);
          return;
        }
        resolve(decoded as jwt.JwtPayload);
      }
    );
  });
}
