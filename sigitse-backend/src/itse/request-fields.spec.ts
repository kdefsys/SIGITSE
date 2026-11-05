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
  applicantPhoneCountry: 'PE',
  establishmentBusinessName: 'Comercio de prueba',
  establishmentAddress: 'Av. Ejemplo 123',
  establishmentDistrict: 'San Miguel',
};

describe('Request fields', () => {
  it('allows submitting without a RUC when it does not apply', () => {
    expect(() => validateRequestFields(complete, true)).not.toThrow();
    expect(() =>
      validateRequestFields({ ...complete, establishmentRuc: '' }, true),
    ).not.toThrow();
  });

  it('trims the business name and preserves leading zeroes in the RUC', () => {
    const fields = normalizeRequestFields({
      ...complete,
      establishmentBusinessName: '  María y José S.A.C.  ',
      establishmentRuc: ' 00123456789 ',
    });
    expect(fields.establishmentBusinessName).toBe('María y José S.A.C.');
    expect(fields.establishmentRuc).toBe('00123456789');
    expect(() => validateRequestFields(fields, true)).not.toThrow();
  });

  it('allows a partial RUC in a draft but requires its full format on submission', () => {
    const fields = { ...complete, establishmentRuc: '001' };
    expect(() => validateRequestFields(fields, false)).not.toThrow();
    expect(() => validateRequestFields(fields, true)).toThrow(
      BadRequestException,
    );
  });

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

  it.each([
    ['PE', '999111222', '+51999111222'],
    ['US', '(202) 555-0123', '+12025550123'],
    ['CA', '4165550123', '+14165550123'],
  ])(
    'validates and formats a national number from %s',
    (country, number, expected) => {
      const values = normalizeRequestFields({
        ...complete,
        applicantPhoneCountry: country,
        applicantPhone: number,
      });
      expect(values.applicantPhone).toBe(expected);
      expect(values.applicantPhoneCountry).toBe(country);
      expect(() => validateRequestFields(values, true)).not.toThrow();
    },
  );

  it.each([
    ['PE', '99911122'],
    ['PE', '+12025550123'],
    ['CA', '+12025550123'],
    ['US', '+14165550123'],
    ['PE', '+51999111222 ext. 123'],
    ['PE', 'llamar al +51999111222'],
  ])(
    'rejects a phone incompatible with %s without extracting or discarding data',
    (country, number) => {
      const values = normalizeRequestFields({
        ...complete,
        applicantPhoneCountry: country,
        applicantPhone: number,
      });
      expect(() => validateRequestFields(values, true)).toThrow(
        BadRequestException,
      );
    },
  );

  it('infers the country for an existing international phone without a stored country', () => {
    const values = normalizeRequestFields({ applicantPhone: '+12025550123' });
    expect(values).toEqual({
      applicantPhone: '+12025550123',
      applicantPhoneCountry: 'US',
    });
  });

  it('keeps the selected country when saving an incomplete draft', () => {
    const values = normalizeRequestFields({
      applicantPhone: '',
      applicantPhoneCountry: 'CA',
    });
    expect(values).toEqual({ applicantPhone: '', applicantPhoneCountry: 'CA' });
    expect(() => validateRequestFields(values, false)).not.toThrow();
  });

  it('preserves a different district in a draft and rejects it on submission', () => {
    const values = normalizeRequestFields({
      ...complete,
      establishmentDistrict: 'Miraflores',
    });
    expect(values.establishmentDistrict).toBe('Miraflores');
    expect(() => validateRequestFields(values, false)).not.toThrow();
    expect(() => validateRequestFields(values, true)).toThrow(
      BadRequestException,
    );
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
    ['applicantPhoneCountry', 'ZZ'],
    ['establishmentDistrict', 'Miraflores'],
    ['establishmentBusinessName', '   '],
    ['establishmentBusinessName', 'a'.repeat(201)],
    ['establishmentRuc', '1234567890'],
    ['establishmentRuc', '123456789012'],
    ['establishmentRuc', '1234567890A'],
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
