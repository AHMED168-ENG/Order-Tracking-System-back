import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsAndStages1711475000000 implements MigrationInterface {
    name = 'AddSettingsAndStages1711475000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create app_settings table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "app_settings" (
            "id" SERIAL PRIMARY KEY,
            "phone_numbers" character varying DEFAULT '',
            "whatsapp" character varying DEFAULT '',
            "facebook_url" character varying DEFAULT '',
            "instagram_url" character varying DEFAULT '',
            "address" text DEFAULT '',
            "other_info" text DEFAULT '',
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )`);

        // 2. Create stage_definitions table
        await queryRunner.query(`CREATE TABLE IF NOT EXISTS "stage_definitions" (
            "id" SERIAL PRIMARY KEY,
            "name" character varying UNIQUE NOT NULL,
            "department" character varying NOT NULL,
            "order_index" integer NOT NULL DEFAULT 0,
            "is_active" boolean NOT NULL DEFAULT true,
            "created_at" TIMESTAMP NOT NULL DEFAULT now(),
            "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )`);

        // 3. Update orders table with piece_count and invoice_image if they don't exist
        // piece_count
        const hasPieceCount = await queryRunner.hasColumn("orders", "piece_count");
        if (!hasPieceCount) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "piece_count" integer NOT NULL DEFAULT 0`);
        }

        // invoice_image
        const hasInvoiceImage = await queryRunner.hasColumn("orders", "invoice_image");
        if (!hasInvoiceImage) {
            await queryRunner.query(`ALTER TABLE "orders" ADD "invoice_image" character varying`);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "invoice_image"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "piece_count"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "stage_definitions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "app_settings"`);
    }

}
