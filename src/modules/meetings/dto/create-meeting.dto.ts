import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  numeroActa: string;

  @IsDateString(
    {},
    { message: 'La fecha de la reunión debe tener un formato válido.' },
  )
  fechaReunion: string;

  @IsString()
  @IsNotEmpty()
  ordenDelDia: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsInt({ each: true })
  @Min(1, { each: true })
  trabajadorIds?: number[];
}
