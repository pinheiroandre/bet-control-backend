-- CreateEnum
CREATE TYPE "bet_status" AS ENUM ('PENDING', 'WON', 'LOST', 'VOID', 'CASHED_OUT', 'HALF_WON', 'HALF_LOST');

-- CreateTable
CREATE TABLE "bet" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "stake" DECIMAL(10,2) NOT NULL,
    "payout" DECIMAL(10,2),
    "odd" DECIMAL(10,3),
    "status" "bet_status" NOT NULL DEFAULT 'PENDING',
    "resolved_at" TIMESTAMP(3),
    "stake_is_bonus" BOOLEAN NOT NULL DEFAULT false,
    "payout_is_bonus" BOOLEAN NOT NULL DEFAULT false,
    "observation" TEXT,
    "bookmaker" UUID NOT NULL,
    "tipster" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bet_bookmaker_idx" ON "bet"("bookmaker");

-- CreateIndex
CREATE INDEX "bet_tipster_idx" ON "bet"("tipster");

-- CreateIndex
CREATE INDEX "bet_date_idx" ON "bet"("date");

-- CreateIndex
CREATE INDEX "bet_status_idx" ON "bet"("status");

-- AddForeignKey
ALTER TABLE "bet" ADD CONSTRAINT "bet_bookmaker_fkey" FOREIGN KEY ("bookmaker") REFERENCES "bookmaker"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bet" ADD CONSTRAINT "bet_tipster_fkey" FOREIGN KEY ("tipster") REFERENCES "tipster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
