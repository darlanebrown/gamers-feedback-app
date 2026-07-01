-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "gameTitle" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pros" TEXT NOT NULL,
    "cons" TEXT NOT NULL,
    "playtime" TEXT NOT NULL,
    "reviewerTag" TEXT NOT NULL,
    "classification" TEXT NOT NULL DEFAULT 'pending',
    "classificationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);
