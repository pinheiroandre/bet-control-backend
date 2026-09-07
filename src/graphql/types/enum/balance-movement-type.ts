import { registerEnumType } from 'type-graphql'

enum BalanceMovementType {
    DEPOSIT = 'DEPOSIT',
    WITHDRAWAL = 'WITHDRAWAL',
    BONUS_CREDIT = 'BONUS_CREDIT'
}

registerEnumType(BalanceMovementType, { name: 'BalanceMovementType' })

export default BalanceMovementType
