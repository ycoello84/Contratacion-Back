import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateMeetingDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  numeroActa?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha de la reunión debe tener un formato válido.' },
  )
  fechaReunion?: string;

  @IsOptional()
  @IsString()
  ordenDelDia?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  @Min(1, { each: true })
  trabajadorIds?: number[];
}
