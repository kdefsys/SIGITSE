import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  receiptNumber: string;

  @IsNumber()
  amount: number;
}
