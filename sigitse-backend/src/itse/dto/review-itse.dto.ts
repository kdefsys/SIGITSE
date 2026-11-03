import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum ReviewAction {
  APROBAR = 'APROBADO',
  OBSERVAR = 'OBSERVADO',
  RECHAZAR = 'RECHAZADO',
}

export class ReviewItseDto {
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @ValidateIf(
    (dto: ReviewItseDto) =>
      dto.action !== ReviewAction.APROBAR || dto.observation !== undefined,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  observation?: string;
}
