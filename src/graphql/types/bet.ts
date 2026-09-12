import { Decimal } from '@prisma/client/runtime/library'
import { Field, ObjectType, InputType, Float } from 'type-graphql'
import { Bookmaker } from './bookmaker'
import BetStatus from './enum/bet-status'
import { Tipster } from './tipster'

@ObjectType()
export class Bet {
    @Field(() => String)
    id!: string

    @Field(() => String)
    description!: string

    @Field(() => String)
    date!: string

    @Field(() => Float)
    stake!: number

    @Field(() => Float, { nullable: true })
    payout?: number

    @Field(() => Float, { nullable: true })
    odd?: number

    @Field(() => BetStatus)
    status!: BetStatus

    @Field(() => String, { nullable: true })
    resolvedAt?: string

    @Field(() => Boolean)
    stakeIsBonus!: boolean

    @Field(() => Boolean)
    payoutIsBonus!: boolean

    @Field(() => String, { nullable: true })
    observation?: string

    @Field(() => Bookmaker)
    bookmaker!: Bookmaker

    @Field(() => Tipster, { nullable: true })
    tipster?: Tipster
}

@InputType()
export class CreateBetInput {
    @Field(() => String)
    description!: string

    @Field(() => String)
    date!: string

    @Field(() => Float)
    stake!: Decimal

    @Field(() => Float, { nullable: true })
    payout?: Decimal

    @Field(() => Float, { nullable: true })
    odd?: Decimal

    @Field(() => BetStatus, { defaultValue: BetStatus.PENDING })
    status?: BetStatus

    @Field(() => String, { nullable: true })
    resolvedAt?: string

    @Field(() => Boolean, { defaultValue: false, nullable: true })
    stakeIsBonus?: boolean

    @Field(() => Boolean, { defaultValue: false, nullable: true })
    payoutIsBonus?: boolean

    @Field(() => String, { nullable: true })
    observation?: string

    @Field(() => String)
    bookmakerId!: string

    @Field(() => String, { nullable: true })
    tipsterId?: string
}

@InputType()
export class UpdateBetInput {
    @Field(() => String, { nullable: true })
    id!: string

    @Field(() => String, { nullable: true })
    description?: string

    @Field(() => String)
    date?: string

    @Field(() => Float, { nullable: true })
    stake?: Decimal

    @Field(() => Float, { nullable: true })
    payout?: Decimal

    @Field(() => Float, { nullable: true })
    odd?: Decimal

    @Field(() => BetStatus, { defaultValue: BetStatus.PENDING })
    status?: BetStatus

    @Field(() => String, { nullable: true })
    resolvedAt?: string

    @Field(() => Boolean, { defaultValue: false, nullable: true })
    stakeIsBonus?: boolean

    @Field(() => Boolean, { defaultValue: false, nullable: true })
    payoutIsBonus?: boolean

    @Field(() => String, { nullable: true })
    observation?: string

    @Field(() => String, { nullable: true })
    bookmakerId?: string

    @Field(() => String, { nullable: true })
    tipsterId?: string
}
