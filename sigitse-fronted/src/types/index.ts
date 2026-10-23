export const Role = {
  ADMINISTRADO: 'ADMINISTRADO',
  INSPECTOR: 'INSPECTOR',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RequestStatus = {
  PENDIENTE: 'PENDIENTE',
  EN_REVISION: 'EN_REVISION',
  OBSERVADO: 'OBSERVADO',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
} as const;

export type RequestStatus =
  (typeof RequestStatus)[keyof typeof RequestStatus];

export interface User {
  id: number;
  email: string;
  role: Role;
}

export interface AuthResponse {
  access_token: string;
  user?: User;
}

export interface Payment {
  id: number;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
}

export interface ItseRequest {
  id: number;
  title: string;
  status: RequestStatus;
  createdAt: string;
  inspectorId?: number;
  payment?: Payment;
}
