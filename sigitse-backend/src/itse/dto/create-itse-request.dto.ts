import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateItseRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @IsNotEmpty()
  userId: number;
}
