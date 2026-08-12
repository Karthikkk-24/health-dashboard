import { IsUUID } from 'class-validator';

export class CreateComparisonDto {
  @IsUUID()
  reportAId!: string;

  @IsUUID()
  reportBId!: string;
}
