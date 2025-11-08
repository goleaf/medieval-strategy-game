-- Reference tables for wall/residence/palace/cranny/hero/oasis subsystems.
-- Designed to mirror the framework-agnostic specification in docs.

-- Villages
CREATE TABLE IF NOT EXISTS villages (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  is_capital BOOLEAN NOT NULL DEFAULT FALSE,
  loyalty INTEGER NOT NULL DEFAULT 100,
  max_loyalty INTEGER NOT NULL DEFAULT 100,
  expansion_slots_total INTEGER NOT NULL DEFAULT 0,
  expansion_slots_used INTEGER NOT NULL DEFAULT 0,
  hero_mansion_level INTEGER NOT NULL DEFAULT 0
);

-- Buildings
CREATE TABLE IF NOT EXISTS buildings (
  id INTEGER PRIMARY KEY,
  village_id INTEGER NOT NULL,
  slot SMALLINT NOT NULL,
  type VARCHAR(32) NOT NULL,
  level INTEGER NOT NULL,
  UNIQUE (village_id, slot)
);

-- Building effects lookup
CREATE TABLE IF NOT EXISTS building_effects (
  type VARCHAR(32) NOT NULL,
  level INTEGER NOT NULL,
  wall_def_pct_per_level DECIMAL(5, 2),
  max_loyalty_cap INTEGER,
  expansion_slot_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  cranny_protected_each_resource BIGINT,
  PRIMARY KEY (type, level)
);

-- Wall profile per village
CREATE TABLE IF NOT EXISTS wall_profiles (
  village_id INTEGER PRIMARY KEY,
  wall_type VARCHAR(32) NOT NULL,
  ram_resistance_multiplier DECIMAL(5, 2) NOT NULL
);

-- Oases
CREATE TABLE IF NOT EXISTS oases (
  id INTEGER PRIMARY KEY,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  bonuses_json JSON NOT NULL,
  animals_json JSON NOT NULL,
  owner_village_id INTEGER,
  annexed_at TIMESTAMP
);

-- Heroes
CREATE TABLE IF NOT EXISTS heroes (
  id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  home_village_id INTEGER,
  alive BOOLEAN NOT NULL DEFAULT TRUE,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  attack_stat INTEGER NOT NULL DEFAULT 0,
  defense_stat INTEGER NOT NULL DEFAULT 0,
  resource_bonus_stat INTEGER NOT NULL DEFAULT 0,
  resource_bonus_mode VARCHAR(8) NOT NULL DEFAULT 'all',
  flat_resource_per_hour INTEGER NOT NULL DEFAULT 0,
  items_json JSON NOT NULL DEFAULT '{}'
);

-- Production snapshot cache
CREATE TABLE IF NOT EXISTS village_production_cache (
  village_id INTEGER PRIMARY KEY,
  wood_per_h DECIMAL(12, 3) NOT NULL,
  clay_per_h DECIMAL(12, 3) NOT NULL,
  iron_per_h DECIMAL(12, 3) NOT NULL,
  crop_per_h DECIMAL(12, 3) NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

-- ---------------------------------------------------------------------------
-- Seeds for building effects (excerpt)
-- ---------------------------------------------------------------------------
INSERT INTO building_effects (type, level, wall_def_pct_per_level, max_loyalty_cap, expansion_slot_unlocked, cranny_protected_each_resource)
VALUES
  ('wall.city_wall', 1, 4.00, NULL, FALSE, NULL),
  ('wall.city_wall', 2, 4.00, NULL, FALSE, NULL),
  ('wall.palisade', 1, 2.50, NULL, FALSE, NULL),
  ('wall.earth_wall', 1, 1.67, NULL, FALSE, NULL),
  ('residence', 1, NULL, 100, FALSE, NULL),
  ('residence', 10, NULL, 100, TRUE, NULL),
  ('residence', 20, NULL, 100, TRUE, NULL),
  ('palace', 1, NULL, 125, FALSE, NULL),
  ('palace', 10, NULL, 125, TRUE, NULL),
  ('palace', 15, NULL, 125, TRUE, NULL),
  ('palace', 20, NULL, 125, TRUE, NULL),
  ('cranny', 1, NULL, NULL, FALSE, 200),
  ('cranny', 2, NULL, NULL, FALSE, 400),
  ('cranny', 3, NULL, NULL, FALSE, 700);

-- Sample wall profile rows (roman/gaul/teuton)
INSERT INTO wall_profiles (village_id, wall_type, ram_resistance_multiplier) VALUES
  (1, 'city_wall', 0.90),
  (2, 'palisade', 1.00),
  (3, 'earth_wall', 1.20)
ON CONFLICT(village_id) DO UPDATE SET
  wall_type = excluded.wall_type,
  ram_resistance_multiplier = excluded.ram_resistance_multiplier;
