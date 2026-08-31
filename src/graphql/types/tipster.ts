import { Field, ObjectType, InputType, Float, Int } from "type-graphql";

@ObjectType()
export class Tipster {
  @Field(() => Int)
  id!: number;

  @Field(() => String)
  name!: string;

  @Field(() => String)
  createdAt!: string;

  @Field(() => String)
  updatedAt!: string;
}

@InputType()
export class CreateTipsterInput {
  @Field(() => String)
  name!: string;
}