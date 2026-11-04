import { BadRequestException } from '@nestjs/common';
import {
  normalizeRequestFields,
  validateRequestFields,
} from './request-fields';

const complete = {
  title: 'Local de prueba',
  description: 'Solicitud ITSE',
  applicantName: 'María Pérez',
  applicantDocumentType: 'DNI',
  applicantDocumentNumber: '00123456',
  applicantEmail: 'maria@example.com',
  applicantPhone: '+51999111222',
  establishmentAddress: 'Av. Ejemplo 123',
  establishmentDistrict: 'San Miguel',
};

describe('Request fields', () => {
  it('normalizes contact data while preserving accents and leading zeroes', () => {
    const values = normalizeRequestFields({
      ...complete,
      applicantName: '  María Pérez  ',
      applicantEmail: '  MARIA@EXAMPLE.COM  ',
      applicantDocumentType: ' dni ',
      applicantDocumentNumber: ' 00123456 ',
      applicantPhone: ' +51 (999) 111-222 ',
    });
    expect(values).toEqual(complete);
    expect(() => validateRequestFields(values, true)).not.toThrow();
  });

  it('allows incomplete drafts, including partially entered contact data', () => {
    expect(() => validateRequestFields({}, false)).not.toThrow();
    expect(() =>
      validateRequestFields(
        { applicantEmail: 'maria@', applicantDocumentNumber: '001' },
        false,
      ),
    ).not.toThrow();
  });

  it('allows an alphanumeric CE without applying the DNI length rule', () => {
    expect(() =>
      validateRequestFields(
        {
          ...complete,
          applicantDocumentType: 'CE',
          applicantDocumentNumber: 'AB001234567',
        },
        true,
      ),
    ).not.toThrow();
  });

  it.each([
    ['applicantDocumentType', 'RUC'],
    ['applicantDocumentNumber', '1234567'],
    ['applicantDocumentNumber', '123456789'],
    ['applicantDocumentNumber', '1234567A'],
    ['applicantEmail', 'invalid'],
    ['applicantPhone', '999ABC222'],
    ['applicantPhone', '123456'],
    ['applicantPhone', '+1234567890123456'],
    ['applicantName', '   '],
    ['title', 'a'.repeat(201)],
  ])('rejects invalid %s with an error for that field', (field, value) => {
    try {
      validateRequestFields({ ...complete, [field]: value }, true);
      throw new Error('Expected validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        message: 'Revisa los campos marcados.',
        errors: { [field]: expect.any(String) },
      });
    }
  });

  it('limits draft field lengths too', () => {
    expect(() =>
      validateRequestFields({ description: 'a'.repeat(2001) }, false),
    ).toThrow(BadRequestException);
  });
});
