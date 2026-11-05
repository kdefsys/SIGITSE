import { Prisma } from '@prisma/client';

export const itseRequestResponseInclude = {
  user: { select: { id: true, name: true, email: true } },
  inspector: { select: { id: true, name: true, email: true } },
  payment: {
    select: {
      id: true,
      receiptNumber: true,
      amount: true,
      paymentDate: true,
    },
  },
  documents: {
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  },
  history: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  },
} satisfies Prisma.ItseRequestInclude;

export type ItseRequestResponseRecord = Prisma.ItseRequestGetPayload<{
  include: typeof itseRequestResponseInclude;
}>;

export interface ItseRequestPersonDto {
  id: number;
  name: string;
  email: string;
}

export interface ItseRequestDocumentDto {
  id: number;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface ItseRequestPaymentDto {
  id: number;
  receiptNumber: string;
  amount: number;
  paymentDate: Date;
}

export interface ItseRequestHistoryDto {
  id: number;
  action: string;
  description: string;
  fromStatus: ItseRequestResponseRecord['status'] | null;
  toStatus: ItseRequestResponseRecord['status'] | null;
  createdAt: Date;
  actor: { id: number; name: string } | null;
}

export interface ItseRequestResponseDto {
  id: number;
  title: string;
  description: string;
  status: ItseRequestResponseRecord['status'];
  createdAt: Date;
  updatedAt: Date;
  startedAt: Date | null;
  dueAt: Date | null;
  applicantName: string | null;
  applicantDocumentType: string | null;
  applicantDocumentNumber: string | null;
  applicantEmail: string | null;
  applicantPhone: string | null;
  applicantPhoneCountry: string | null;
  establishmentAddress: string | null;
  establishmentDistrict: string | null;
  inspectorId: number | null;
  user: ItseRequestPersonDto;
  inspector: ItseRequestPersonDto | null;
  payment: ItseRequestPaymentDto | null;
  documents: ItseRequestDocumentDto[];
  history: ItseRequestHistoryDto[];
}

export function toItseRequestResponseDto(
  request: ItseRequestResponseRecord,
): ItseRequestResponseDto {
  return {
    id: request.id,
    title: request.title,
    description: request.description,
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    startedAt: request.startedAt,
    dueAt: request.dueAt,
    applicantName: request.applicantName,
    applicantDocumentType: request.applicantDocumentType,
    applicantDocumentNumber: request.applicantDocumentNumber,
    applicantEmail: request.applicantEmail,
    applicantPhone: request.applicantPhone,
    applicantPhoneCountry: request.applicantPhoneCountry,
    establishmentAddress: request.establishmentAddress,
    establishmentDistrict: request.establishmentDistrict,
    inspectorId: request.inspectorId,
    user: request.user,
    inspector: request.inspector,
    payment: request.payment,
    documents: request.documents,
    history: request.history,
  };
}
