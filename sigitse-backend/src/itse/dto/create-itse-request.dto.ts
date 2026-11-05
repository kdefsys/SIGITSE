import { IsEmail, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateItseRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @IsString()
  @IsNotEmpty()
  applicantDocumentType: string;

  @IsString()
  @IsNotEmpty()
  applicantDocumentNumber: string;

  @IsEmail()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  applicantEmail: string;

  @IsString()
  @IsNotEmpty()
  applicantPhone: string;

  @ValidateIf((_dto, value: unknown) => value !== undefined)
  @IsString()
  applicantPhoneCountry?: string;

  @IsString()
  @IsNotEmpty()
  establishmentAddress: string;

  @IsString()
  @IsNotEmpty()
  establishmentDistrict: string;
}
