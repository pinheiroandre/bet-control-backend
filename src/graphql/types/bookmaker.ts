import { Field, ObjectType, InputType, Float, Int } from "type-graphql";

// Representa como o Bookmaker é exposto para o frontend via GraphQL.
// Note que os tipos aqui são os "tipos de saída" (number, string) — a
// conversão de Decimal/Date do Prisma para esses tipos acontece no resolver,
// não aqui (este arquivo só descreve o formato, não resolve nada).
//
// IMPORTANTE: como rodamos via tsx (que usa esbuild), a inferência automática
// de tipo do type-graphql (baseada em emitDecoratorMetadata do tsc) NÃO
// funciona — o esbuild não gera esses metadados. Por isso, TODO @Field()
// abaixo precisa do tipo explícito entre parênteses, mesmo String.
@ObjectType()
export class Bookmaker {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  description!: string;

  @Field(() => Float)
  initialBalance!: number;

  @Field(() => String)
  initialBalanceDate!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

// Equivalente ao "input CreateBookmakerInput" que tínhamos no SDL manual.
@InputType()
export class CreateBookmakerInput {
  @Field(() => String)
  description!: string;

  @Field(() => Float, { nullable: true })
  initialBalance?: number;

  @Field(() => String)
  initialBalanceDate!: string;
}