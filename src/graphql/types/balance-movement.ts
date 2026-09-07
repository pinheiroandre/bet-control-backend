import { Field, Float, InputType, ObjectType } from 'type-graphql'
import { Bookmaker } from './bookmaker'
import BalanceMovementType from './enum/balance-movement-type'

@ObjectType()
export class BalanceMovement {
    @Field(() => String)
    id!: string

    @Field(() => String)
    description!: string

    @Field(() => String)
    type!: string

    @Field(() => Float)
    amount!: number

    @Field(() => String)
    date!: string

    @Field(() => Bookmaker)
    bookmaker!: Bookmaker
}

@InputType()
export class CreateBalanceMovementInput {
    @Field(() => String)
    description!: string

    @Field(() => BalanceMovementType)
    type!: BalanceMovementType

    @Field(() => Float)
    amount!: number

    @Field(() => String)
    date!: string

    @Field(() => String)
    bookmakerId!: string
}
