import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class NotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  report_ready?: boolean;
}

export class UpdateProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notification_preferences?: NotificationPreferencesDto;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date_of_birth must be YYYY-MM-DD',
  })
  date_of_birth?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['male', 'female', 'other', 'prefer_not_to_say'])
  sex?: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(50)
  @Max(250)
  height_cm?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(20)
  @Max(400)
  weight_kg?: number | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIn(['sedentary', 'light', 'moderate', 'active'])
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsBoolean()
  smoker?: boolean | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsBoolean()
  has_diabetes?: boolean | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsBoolean()
  on_bp_medication?: boolean | null;
}
