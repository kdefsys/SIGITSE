import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

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
  applicantEmail: string;

  @IsString()
  @IsNotEmpty()
  applicantPhone: string;

  @IsString()
  @IsNotEmpty()
  establishmentAddress: string;

  @IsString()
  @IsNotEmpty()
  establishmentDistrict: string;
}
