-- CreateTable
CREATE TABLE "outfit_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "outfit_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "reasons" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "outfit_feedback_user_id_outfit_id_key" ON "outfit_feedback"("user_id", "outfit_id");

-- AddForeignKey
ALTER TABLE "outfit_feedback" ADD CONSTRAINT "outfit_feedback_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "swap_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "outfit_id" TEXT NOT NULL,
    "outfit_item_id" TEXT NOT NULL,
    "from_wardrobe_item_id" TEXT NOT NULL,
    "to_wardrobe_item_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swap_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference_weights" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "weights" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_preference_weights_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_weights_user_id_key" ON "user_preference_weights"("user_id");
