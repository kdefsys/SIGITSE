import { IsString, ValidateIf } from 'class-validator';

export class SaveItseDraftDto {
  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  title?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  description?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantName?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantDocumentType?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantDocumentNumber?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantEmail?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantPhone?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantPhoneCountry?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  establishmentBusinessName?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  establishmentRuc?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  establishmentAddress?: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  establishmentDistrict?: string;
}
