import { Field, ObjectType, InputType } from 'type-graphql'

@ObjectType()
export class Tipster {
    @Field(() => String)
    id!: string

    @Field(() => String)
    name!: string
}

@InputType()
export class CreateTipsterInput {
    @Field(() => String)
    name!: string
}

@InputType()
export class UpdateTipsterInput {
    @Field(() => String)
    id!: string

    @Field(() => String)
    name!: string
}
