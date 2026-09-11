// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const toIsoString = (date: any) => {
    return date.toISOString().split('T')[0]
}
