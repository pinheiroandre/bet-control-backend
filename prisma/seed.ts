/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, PrismaClient } from '@prisma/client'
import dbFixture from './fixtures/db.json'

const prisma = new PrismaClient()

interface TableFixture {
    // Precisa ser IGUAL ao nome do model no Prisma Client (ex: model
    // Bookmaker -> "bookmaker") — é assim que localizamos o model certo
    // dinamicamente, sem precisar editar este arquivo a cada tabela nova.
    name: string
    rows: Record<string, unknown>[]
}

// Confere se a tabela já existe no banco, antes de tentar usá-la — assim
// o db.json pode "adiantar" dados de entidades que ainda não foram criadas
// (ex: Tipster), sem quebrar o seed das que já existem.
async function tableExists(tableName: string): Promise<boolean> {
    const result = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
        `SELECT EXISTS (
       SELECT FROM information_schema.tables WHERE table_name = $1
     ) AS "exists"`,
        tableName
    )

    return result[0]?.exists ?? false
}

// O Prisma gera, a partir do schema.prisma, um "mapa" interno com o tipo
// real de cada campo de cada model — o DMMF. Usamos ele para descobrir
// QUAIS campos são DateTime de verdade, em vez de adivinhar pelo nome
// (ex: teria falhado para um campo tipo "lastAccessAt", que não termina em
// "Date"). Isso funciona para qualquer tabela nova, automaticamente.
function getDateTimeFields(modelAccessorName: string): Set<string> {
    // No Prisma Client, o accessor é sempre o nome do model com a primeira
    // letra minúscula (model Bookmaker -> prisma.bookmaker). Aqui revertemos
    // isso para achar o model correspondente no DMMF.
    const modelName =
        modelAccessorName.charAt(0).toUpperCase() + modelAccessorName.slice(1)
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName)

    if (!model) return new Set()

    return new Set(
        model.fields
            .filter(field => field.type === 'DateTime')
            .map(field => field.name)
    )
}

// Converte, para os campos que o schema.prisma REALMENTE declara como
// DateTime, o valor de string (vindo do JSON) para um objeto Date de
// verdade — o Prisma exige isso para aceitar a data corretamente.
function normalizeRow(
    row: Record<string, unknown>,
    dateTimeFields: Set<string>
): Record<string, unknown> {
    const normalized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string' && dateTimeFields.has(key)) {
            normalized[key] = new Date(value)
        } else {
            normalized[key] = value
        }
    }

    return normalized
}

async function seedTable(table: TableFixture) {
    const exists = await tableExists(table.name)

    if (!exists) {
        console.warn(
            `⚠️  Tabela "${table.name}" ainda não existe no banco — pulando (crie a migration dessa entidade antes de usar essa parte do seed).`
        )

        return
    }

    // (prisma as any)[table.name] acessa o model certo dinamicamente, pelo
    // nome — é isso que permite o script funcionar para qualquer tabela nova
    // sem precisar editar este arquivo.
    const model = (prisma as any)[table.name]

    if (!model) {
        console.warn(
            `⚠️  Não existe um model do Prisma chamado "${table.name}" — pulando.`
        )

        return
    }

    // TRUNCATE ... RESTART IDENTITY apaga tudo e reinicia a contagem de id —
    // garante que "yarn setup" sempre deixe o banco no mesmo estado.
    await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${table.name}" RESTART IDENTITY CASCADE;`
    )

    if (table.rows.length > 0) {
        const dateTimeFields = getDateTimeFields(table.name)
        const rows = table.rows.map(row => normalizeRow(row, dateTimeFields))

        await model.createMany({ data: rows })
    }

    console.log(
        `✅ ${table.name}: ${table.rows.length} registro(s) inserido(s).`
    )
}

async function main() {
    for (const table of dbFixture as TableFixture[]) {
        await seedTable(table)
    }
}

main()
    .catch(error => {
        console.error('❌ Erro ao aplicar o seed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
