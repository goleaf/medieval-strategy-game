-- Add dedicated archer defense stat to unit types
ALTER TABLE "UnitType" ADD COLUMN "defArch" INTEGER NOT NULL DEFAULT 0;
