import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIdToLogs1707184800000 implements MigrationInterface {
    name = 'AddUserIdToLogs1707184800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add user_id column
        await queryRunner.query(`
            ALTER TABLE "automation_logs"
            ADD COLUMN IF NOT EXISTS "user_id" uuid NULL
        `);

        // Make automation_id nullable
        await queryRunner.query(`
            ALTER TABLE "automation_logs"
            ALTER COLUMN "automation_id" DROP NOT NULL
        `);

        // Create index on user_id
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_automation_logs_user_id"
            ON "automation_logs" ("user_id")
        `);

        // Create composite index on user_id and executed_at
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_automation_logs_user_id_executed_at"
            ON "automation_logs" ("user_id", "executed_at")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_automation_logs_user_id_executed_at"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_automation_logs_user_id"`);
        await queryRunner.query(`ALTER TABLE "automation_logs" ALTER COLUMN "automation_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "automation_logs" DROP COLUMN IF EXISTS "user_id"`);
    }
}
