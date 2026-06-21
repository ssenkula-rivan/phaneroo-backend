import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddVehicleNumberPlateToJourney1781755000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'journeys',
      new TableColumn({
        name: 'vehicle_number_plate',
        type: 'varchar',
        isNullable: false,
        default: "''",
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('journeys', 'vehicle_number_plate');
  }
}
