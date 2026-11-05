export const Role = {
  ADMINISTRADO: 'ADMINISTRADO',
  INSPECTOR: 'INSPECTOR',
  FUNCIONARIO: 'FUNCIONARIO',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const RequestStatus = {
  BORRADOR: 'BORRADOR',
  PENDIENTE: 'PENDIENTE',
  EN_REVISION: 'EN_REVISION',
  OBSERVADO: 'OBSERVADO',
  APROBADO: 'APROBADO',
  RECHAZADO: 'RECHAZADO',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

export interface AdminUser extends User {
  createdAt: string;
}

export interface AuthResponse {
  message: string;
  token: {
    access_token: string;
  };
  user: User;
}

export interface Payment {
  id: number;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
}

export interface ItseDocument {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ItseHistoryEntry {
  id: number;
  action: string;
  description: string;
  fromStatus?: RequestStatus | null;
  toStatus?: RequestStatus | null;
  createdAt: string;
  actor?: Pick<User, 'id' | 'name'> | null;
}

export interface ItseRequest {
  id: number;
  title: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  startedAt: string | null;
  dueAt: string | null;
  applicantName: string | null;
  applicantDocumentType: string | null;
  applicantDocumentNumber: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  applicantPhoneCountry: string | null;
  establishmentBusinessName: string | null;
  establishmentRuc: string | null;
  establishmentAddress: string | null;
  establishmentDistrict: string | null;
  description?: string;
  inspectorId?: number;
  payment?: Payment;
  documents?: ItseDocument[];
  history?: ItseHistoryEntry[];
  user?: Pick<User, 'id' | 'name' | 'email'>;
  inspector?: Pick<User, 'id' | 'name' | 'email'> | null;
}
