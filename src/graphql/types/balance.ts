import { Field, ObjectType, Float } from 'type-graphql'

@ObjectType()
export class ShalonBookmaker {
    @Field(() => String)
    id!: string

    @Field(() => String)
    description!: string
}

@ObjectType()
export class BookmakerBalance {
    @Field(() => Float)
    real!: number

    @Field(() => Float)
    bonus!: number
}

@ObjectType()
export class Balance {
    @Field(() => ShalonBookmaker)
    bookmaker!: ShalonBookmaker

    @Field(() => BookmakerBalance)
    balance!: BookmakerBalance
}
