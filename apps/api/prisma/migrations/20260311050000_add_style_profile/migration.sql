-- CreateTable
CREATE TABLE "style_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "body_type" TEXT NOT NULL,
    "height_range" TEXT NOT NULL,
    "skin_undertone" TEXT NOT NULL,
    "style_vibe" TEXT NOT NULL,
    "fit_preference" TEXT NOT NULL,
    "favorite_colors" TEXT[],
    "avoid_colors" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "style_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "style_profiles_user_id_key" ON "style_profiles"("user_id");

-- AddForeignKey
ALTER TABLE "style_profiles" ADD CONSTRAINT "style_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
