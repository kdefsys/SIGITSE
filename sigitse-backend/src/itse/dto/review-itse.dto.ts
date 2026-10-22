import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ReviewAction {
  APROBAR = 'APROBADO',
  OBSERVAR = 'OBSERVADO',
  RECHAZAR = 'RECHAZADO',
}

export class ReviewItseDto {
  @IsEnum(ReviewAction)
  action: ReviewAction;

  @IsOptional()
  @IsString()
  observation?: string;
}
