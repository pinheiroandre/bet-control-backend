-- CreateTable
CREATE TABLE "bookmaker" (
    "id" SERIAL NOT NULL,
    "description" TEXT NOT NULL,
    "initial_balance" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "initial_balance_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookmaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipster" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipster_pkey" PRIMARY KEY ("id")
);
