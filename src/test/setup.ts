import dotenv from "dotenv";

// Sobrescreve DATABASE_URL (e qualquer outra variável) com o conteúdo de
// .env.test, garantindo que os testes NUNCA rodem contra o banco de
// desenvolvimento por engano.
dotenv.config({ path: ".env.test", override: true });
