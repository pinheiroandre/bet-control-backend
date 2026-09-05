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

// Descobre o nome REAL da tabela no banco (pós @@map) a partir do nome do
// model no Prisma Client. Necessário porque nomes com mais de uma palavra
// (ex: MonthClosing -> month_closing) divergem do accessor camelCase
// (monthClosing) — algo que passou despercebido com bookmaker/tipster/bet
// só porque eles têm nomes de uma palavra só.
function getDbTableName(modelAccessorName: string): string {
    const modelName =
        modelAccessorName.charAt(0).toUpperCase() + modelAccessorName.slice(1)
    const model = Prisma.dmmf.datamodel.models.find(m => m.name === modelName)

    // Se o model nem existe ainda no schema, não há como saber o nome real
    // da tabela — devolvemos o próprio nome do JSON como fallback, que
    // simplesmente não vai ser encontrado no banco (mesmo comportamento já
    // esperado: tabela "adiantada" que ainda não existe é pulada).
    return model?.dbName ?? modelAccessorName
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
    const dbTableName = getDbTableName(table.name)
    const exists = await tableExists(dbTableName)

    if (!exists) {
        console.warn(
            `⚠️  Tabela "${table.name}" ainda não existe no banco — pulando (crie a migration dessa entidade antes de usar essa parte do seed).`
        )

        return
    }

    // (prisma as any)[table.name] continua usando o nome do MODEL (accessor
    // do Prisma Client) — isso não muda, é diferente do nome real da tabela.
    const model = (prisma as any)[table.name]

    if (!model) {
        console.warn(
            `⚠️  Não existe um model do Prisma chamado "${table.name}" — pulando.`
        )

        return
    }

    // TRUNCATE precisa do nome REAL da tabela (pós @@map), não do accessor.
    await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "${dbTableName}" RESTART IDENTITY CASCADE;`
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
