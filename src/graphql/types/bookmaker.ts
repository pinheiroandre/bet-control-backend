import { Field, ObjectType, InputType, Float } from 'type-graphql'

@ObjectType()
export class Bookmaker {
    @Field(() => String)
    id!: string

    @Field(() => String)
    description!: string

    @Field(() => Float)
    initialBalance!: number

    @Field(() => String)
    initialBalanceDate!: string
}

@InputType()
export class CreateBookmakerInput {
    @Field(() => String)
    description!: string

    @Field(() => Float, { nullable: true })
    initialBalance?: number

    @Field(() => String)
    initialBalanceDate!: string
}

@InputType()
export class UpdateBookmakerInput {
    @Field(() => String)
    id!: string

    @Field(() => String, { nullable: true })
    description?: string

    @Field(() => Float, { nullable: true })
    initialBalance?: number

    @Field(() => String, { nullable: true })
    initialBalanceDate?: string
}
