import { BadRequestException } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { SaveItseDraftDto } from './dto/save-itse-draft.dto';

const FIELD_LIMITS = {
  title: 200,
  description: 2000,
  applicantName: 200,
  applicantDocumentType: 3,
  applicantDocumentNumber: 20,
  applicantEmail: 254,
  applicantPhone: 16,
  establishmentAddress: 300,
  establishmentDistrict: 100,
} as const;

type RequestFields = Partial<Record<keyof SaveItseDraftDto, string | null>>;

export function normalizeRequestFields<T extends RequestFields>(fields: T): T {
  const normalized = Object.fromEntries(
    Object.entries(fields).map(([key, value]) => [
      key,
      typeof value === 'string' ? value.trim() : value,
    ]),
  ) as T;
  if (normalized.applicantEmail != null) {
    normalized.applicantEmail = normalized.applicantEmail.toLowerCase();
  }
  if (normalized.applicantDocumentType != null) {
    normalized.applicantDocumentType =
      normalized.applicantDocumentType.toUpperCase();
  }
  if (normalized.applicantDocumentNumber != null) {
    normalized.applicantDocumentNumber =
      normalized.applicantDocumentNumber.toUpperCase();
  }
  if (normalized.applicantPhone != null) {
    normalized.applicantPhone = normalized.applicantPhone.replace(
      /[\s()-]/g,
      '',
    );
  }
  return normalized;
}

export function validateRequestFields(
  fields: RequestFields,
  complete: boolean,
) {
  const errors: Partial<Record<keyof SaveItseDraftDto, string>> = {};
  for (const [name, limit] of Object.entries(FIELD_LIMITS)) {
    const key = name as keyof SaveItseDraftDto;
    const value = fields[key];
    if (complete && !value?.trim()) errors[key] = 'Completa este campo.';
    if (value && value.length > limit)
      errors[key] = `Máximo ${limit} caracteres.`;
  }
  if (complete) {
    if (
      fields.applicantDocumentType &&
      !['DNI', 'CE'].includes(fields.applicantDocumentType)
    ) {
      errors.applicantDocumentType = 'Selecciona DNI o carné de extranjería.';
    }
    if (fields.applicantDocumentNumber) {
      if (
        fields.applicantDocumentType === 'DNI' &&
        !/^\d{8}$/.test(fields.applicantDocumentNumber)
      ) {
        errors.applicantDocumentNumber = 'El DNI debe tener 8 dígitos.';
      }
      if (
        fields.applicantDocumentType === 'CE' &&
        !/^[A-Z0-9]{1,20}$/.test(fields.applicantDocumentNumber)
      ) {
        errors.applicantDocumentNumber =
          'El CE admite hasta 20 letras o dígitos.';
      }
    }
    if (fields.applicantEmail && !isEmail(fields.applicantEmail)) {
      errors.applicantEmail = 'Ingresa un correo electrónico válido.';
    }
    if (
      fields.applicantPhone &&
      !/^\+?[0-9]{7,15}$/.test(fields.applicantPhone)
    ) {
      errors.applicantPhone =
        'Ingresa entre 7 y 15 dígitos, con + internacional opcional.';
    }
  }
  if (Object.keys(errors).length) {
    throw new BadRequestException({
      message: 'Revisa los campos marcados.',
      errors,
    });
  }
}
