-- Add siegeRulesConfig JSON column to WorldConfig for catapult rule overrides
ALTER TABLE "WorldConfig" ADD COLUMN "siegeRulesConfig" JSON DEFAULT '{}';
