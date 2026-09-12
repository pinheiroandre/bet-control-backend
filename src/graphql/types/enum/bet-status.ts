import { registerEnumType } from 'type-graphql'

enum BetStatus {
    PENDING = 'PENDING',
    WON = 'WON',
    LOST = 'LOST',
    VOID = 'VOID',
    CASHED_OUT = 'CASHED_OUT',
    HALF_WON = 'HALF_WON',
    HALF_LOST = 'HALF_LOST'
}

registerEnumType(BetStatus, { name: 'BetStatus' })

export default BetStatus
