-- -------------------------------------------------------------
-- TablePlus 3.12.8(368)
--
-- https://tableplus.com/
--
-- Database: kedar
-- Generation Time: 2021-05-20 03:34:29.6640
-- -------------------------------------------------------------


DROP TABLE IF EXISTS "public"."categories";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS categories_category_id_seq;

-- Table Definition
CREATE TABLE "public"."categories" (
    "category_name" varchar(100) NOT NULL,
    "category_id" int4 NOT NULL DEFAULT nextval('categories_category_id_seq'::regclass),
    PRIMARY KEY ("category_id")
);

DROP TABLE IF EXISTS "public"."hashtags";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS hashtags_hashtag_id_seq;

-- Table Definition
CREATE TABLE "public"."hashtags" (
    "hashtag_name" varchar(100) NOT NULL,
    "hashtag_id" int4 NOT NULL DEFAULT nextval('hashtags_hashtag_id_seq'::regclass),
    PRIMARY KEY ("hashtag_id")
);

DROP TABLE IF EXISTS "public"."junction_table";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Table Definition
CREATE TABLE "public"."junction_table" (
    "logo_id" int4 NOT NULL,
    "hashtag_id" int4 NOT NULL
);

DROP TABLE IF EXISTS "public"."login";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Table Definition
CREATE TABLE "public"."login" (
    "email" varchar(100),
    "hash" bpchar(60)
);

DROP TABLE IF EXISTS "public"."logos";
-- This script only contains the table creation statements and does not fully represent the table in the database. It's still missing: indices, triggers. Do not use it as a backup.

-- Sequence and defined type
CREATE SEQUENCE IF NOT EXISTS logos_logo_id_seq;

-- Table Definition
CREATE TABLE "public"."logos" (
    "name" varchar(100),
    "description" text,
    "logo_img_url" varchar(500),
    "logo_id" int4 NOT NULL DEFAULT nextval('logos_logo_id_seq'::regclass),
    "category" int4,
    PRIMARY KEY ("logo_id")
);

ALTER TABLE "public"."logos" ADD FOREIGN KEY ("category") REFERENCES "public"."categories"("category_id");
