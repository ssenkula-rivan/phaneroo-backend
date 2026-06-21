import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1781754882581 implements MigrationInterface {
  name = 'InitSchema1781754882581';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await queryRunner.query(
      `CREATE TABLE "coordinator_profiles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "coordinator_code" character varying NOT NULL, "stage_name" character varying, "district" character varying NOT NULL, "region" character varying NOT NULL, "vehicle_type" character varying, "vehicle_registration_number" character varying, "emergency_contact_name" character varying, "emergency_contact_phone" character varying, "profile_photo_url" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "REL_efbd1d637344030952817d19b7" UNIQUE ("user_id"), CONSTRAINT "PK_af42f757d79221aa02706421c4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fa3c00400fe30d54f5e197b2bc" ON "coordinator_profiles" ("coordinator_code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17d185279f748c95462bfc2e0b" ON "coordinator_profiles" ("district") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_971bf4cd3e2e4d676c2e4cd6af" ON "coordinator_profiles" ("region") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "phoneNumber" character varying NOT NULL, "fullName" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" character varying NOT NULL DEFAULT 'viewer', "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1e3d0240b49c40521aaeb95329" ON "users" ("phoneNumber") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "token_hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "replaced_by_token_hash" character varying, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a7838d2ba25be1342091b6695f" ON "refresh_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "registration_number" character varying NOT NULL, "type" character varying, "capacity" integer NOT NULL, "driver_name" character varying, "driver_phone" character varying, "fuel_level_percent" double precision, "last_fuel_stop_at" TIMESTAMP WITH TIME ZONE, "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2abf18fae2b9477bc192767531" ON "vehicles" ("registration_number") `,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "vehicle_id" uuid NOT NULL, "coordinator_user_id" uuid NOT NULL, "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL, "unassigned_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4c5e2468eb9c098d4cff2dd8545" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a81506107aa91a9601b6db1c5f" ON "vehicle_assignments" ("vehicle_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_962662a84bf918a8d96d9d398a" ON "vehicle_assignments" ("coordinator_user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "journeys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "coordinator_user_id" uuid NOT NULL, "vehicle_id" uuid, "departure_name" character varying NOT NULL, "departure_lat" double precision NOT NULL, "departure_lng" double precision NOT NULL, "destination_name" character varying NOT NULL, "destination_lat" double precision NOT NULL, "destination_lng" double precision NOT NULL, "status" character varying NOT NULL DEFAULT 'planned', "started_at" TIMESTAMP WITH TIME ZONE, "ended_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_94b31b067846c92b6811046c81e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cadaceea6b9dabb65fe6447144" ON "journeys" ("coordinator_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b123fb6148d2388fa6ebd56fa" ON "journeys" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "location_pings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "journey_id" uuid NOT NULL, "coordinator_user_id" uuid NOT NULL, "latitude" double precision NOT NULL, "longitude" double precision NOT NULL, "speed_kph" double precision, "heading_degrees" double precision, "accuracy_meters" double precision, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b666c5c0408c8bd318811640532" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d0260622b6e07b6ecae7a8b0b" ON "location_pings" ("journey_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_68d81be45d6cbe0f1ba89db489" ON "location_pings" ("coordinator_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a858c4d73a8624cb0811e2bd04" ON "location_pings" ("journey_id", "recorded_at") `,
    );

    await queryRunner.query(`ALTER TABLE "location_pings" ADD COLUMN "geom" geography(Point,4326)`);
    await queryRunner.query(
      `CREATE INDEX "IDX_location_pings_geom" ON "location_pings" USING GIST ("geom")`,
    );
    await queryRunner.query(
      `ALTER TABLE "coordinator_profiles" ADD CONSTRAINT "FK_efbd1d637344030952817d19b78" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "FK_a81506107aa91a9601b6db1c5f6" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "FK_962662a84bf918a8d96d9d398a8" FOREIGN KEY ("coordinator_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journeys" ADD CONSTRAINT "FK_cadaceea6b9dabb65fe64471442" FOREIGN KEY ("coordinator_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "journeys" ADD CONSTRAINT "FK_cbdda1979cbb4990d13c765e90c" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_pings" ADD CONSTRAINT "FK_5d0260622b6e07b6ecae7a8b0b8" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_pings" ADD CONSTRAINT "FK_68d81be45d6cbe0f1ba89db489a" FOREIGN KEY ("coordinator_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "location_pings" DROP CONSTRAINT "FK_68d81be45d6cbe0f1ba89db489a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "location_pings" DROP CONSTRAINT "FK_5d0260622b6e07b6ecae7a8b0b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journeys" DROP CONSTRAINT "FK_cbdda1979cbb4990d13c765e90c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "journeys" DROP CONSTRAINT "FK_cadaceea6b9dabb65fe64471442"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_assignments" DROP CONSTRAINT "FK_962662a84bf918a8d96d9d398a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_assignments" DROP CONSTRAINT "FK_a81506107aa91a9601b6db1c5f6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coordinator_profiles" DROP CONSTRAINT "FK_efbd1d637344030952817d19b78"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_location_pings_geom"`);
    await queryRunner.query(`ALTER TABLE "location_pings" DROP COLUMN "geom"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a858c4d73a8624cb0811e2bd04"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_68d81be45d6cbe0f1ba89db489"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5d0260622b6e07b6ecae7a8b0b"`);
    await queryRunner.query(`DROP TABLE "location_pings"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8b123fb6148d2388fa6ebd56fa"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cadaceea6b9dabb65fe6447144"`);
    await queryRunner.query(`DROP TABLE "journeys"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_962662a84bf918a8d96d9d398a"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a81506107aa91a9601b6db1c5f"`);
    await queryRunner.query(`DROP TABLE "vehicle_assignments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2abf18fae2b9477bc192767531"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a7838d2ba25be1342091b6695f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1e3d0240b49c40521aaeb95329"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_971bf4cd3e2e4d676c2e4cd6af"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_17d185279f748c95462bfc2e0b"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fa3c00400fe30d54f5e197b2bc"`);
    await queryRunner.query(`DROP TABLE "coordinator_profiles"`);
  }
}
