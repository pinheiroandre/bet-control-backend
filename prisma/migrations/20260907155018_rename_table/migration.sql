/*
  Warnings:

  - You are about to drop the `transaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "balance_movement_type" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BONUS_CREDIT');

-- DropForeignKey
ALTER TABLE "transaction" DROP CONSTRAINT "transaction_bookmaker_fkey";

-- DropTable
DROP TABLE "transaction";

-- DropEnum
DROP TYPE "transaction_type";

-- CreateTable
CREATE TABLE "balance_movement" (
    "id" UUID NOT NULL,
    "type" "balance_movement_type" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "bookmaker" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "balance_movement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_movement_bookmaker_idx" ON "balance_movement"("bookmaker");

-- CreateIndex
CREATE INDEX "balance_movement_date_idx" ON "balance_movement"("date");

-- CreateIndex
CREATE INDEX "balance_movement_type_idx" ON "balance_movement"("type");

-- AddForeignKey
ALTER TABLE "balance_movement" ADD CONSTRAINT "balance_movement_bookmaker_fkey" FOREIGN KEY ("bookmaker") REFERENCES "bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
