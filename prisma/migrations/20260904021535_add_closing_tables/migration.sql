-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BONUS_CREDIT');

-- CreateTable
CREATE TABLE "transaction" (
    "id" UUID NOT NULL,
    "type" "transaction_type" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "bookmaker" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "month_closing" (
    "id" UUID NOT NULL,
    "reference_month" DATE NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "month_closing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "balance_closing" (
    "id" UUID NOT NULL,
    "month_closing" UUID NOT NULL,
    "bookmaker" UUID NOT NULL,
    "real_balance" DECIMAL(10,2) NOT NULL,
    "bonus_balance" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_closing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_bookmaker_idx" ON "transaction"("bookmaker");

-- CreateIndex
CREATE INDEX "transaction_date_idx" ON "transaction"("date");

-- CreateIndex
CREATE INDEX "transaction_type_idx" ON "transaction"("type");

-- CreateIndex
CREATE UNIQUE INDEX "month_closing_reference_month_key" ON "month_closing"("reference_month");

-- CreateIndex
CREATE INDEX "balance_closing_bookmaker_idx" ON "balance_closing"("bookmaker");

-- CreateIndex
CREATE UNIQUE INDEX "balance_closing_month_closing_bookmaker_key" ON "balance_closing"("month_closing", "bookmaker");

-- AddForeignKey
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_bookmaker_fkey" FOREIGN KEY ("bookmaker") REFERENCES "bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_closing" ADD CONSTRAINT "balance_closing_month_closing_fkey" FOREIGN KEY ("month_closing") REFERENCES "month_closing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "balance_closing" ADD CONSTRAINT "balance_closing_bookmaker_fkey" FOREIGN KEY ("bookmaker") REFERENCES "bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
