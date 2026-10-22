import { IsInt, IsNotEmpty } from 'class-validator';

export class AssignInspectorDto {
  @IsInt()
  @IsNotEmpty()
  inspectorId: number;
}
