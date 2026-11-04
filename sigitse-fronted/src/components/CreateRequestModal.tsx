import React, { useState } from 'react';
import axios from 'axios';
import api from '../api/axios';
import type { ItseRequest } from '../types';

interface DraftFields {
  title: string;
  description: string;
  applicantName: string;
  applicantDocumentType: string;
  applicantDocumentNumber: string;
  applicantEmail: string;
  applicantPhone: string;
  establishmentAddress: string;
  establishmentDistrict: string;
}

type FieldName = keyof DraftFields;
type FieldErrors = Partial<Record<FieldName, string>>;

const fieldLimits: Record<FieldName, number> = {
  title: 200,
  description: 2000,
  applicantName: 200,
  applicantDocumentType: 3,
  applicantDocumentNumber: 20,
  applicantEmail: 254,
  applicantPhone: 16,
  establishmentAddress: 300,
  establishmentDistrict: 100,
};

interface Props {
  isOpen: boolean;
  draft: ItseRequest | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export const CreateRequestModal: React.FC<Props> = ({ isOpen, draft, onClose, onSuccess }) => {
  const [fields, setFields] = useState<DraftFields>(() => ({
    title: draft?.title ?? '',
    description: draft?.description ?? '',
    applicantName: draft?.applicantName ?? '',
    applicantDocumentType: draft?.applicantDocumentType ?? '',
    applicantDocumentNumber: draft?.applicantDocumentNumber ?? '',
    applicantEmail: draft?.applicantEmail ?? '',
    applicantPhone: draft?.applicantPhone ?? '',
    establishmentAddress: draft?.establishmentAddress ?? '',
    establishmentDistrict: draft?.establishmentDistrict ?? '',
  }));
  const [savedDraftId, setSavedDraftId] = useState(draft?.id);
  const [file, setFile] = useState<File | null>(null);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  const [action, setAction] = useState<'draft' | 'present' | null>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const loading = action !== null;

  if (!isOpen) return null;

  const changeField = (name: FieldName, value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({
      ...current,
      [name]: undefined,
      ...(name === 'applicantDocumentType' ? { applicantDocumentNumber: undefined } : {}),
    }));
  };

  const save = async (present: boolean) => {
    if (loading) return;
    setError('');
    const values = Object.fromEntries(
      Object.entries(fields).map(([name, value]) => [name, value.trim()]),
    ) as unknown as DraftFields;
    values.applicantEmail = values.applicantEmail.toLowerCase();
    values.applicantDocumentType = values.applicantDocumentType.toUpperCase();
    values.applicantDocumentNumber = values.applicantDocumentNumber.toUpperCase();
    values.applicantPhone = values.applicantPhone.replace(/[\s()-]/g, '');
    const errors: FieldErrors = {};
    for (const name of Object.keys(values) as FieldName[]) {
      if (values[name].length > fieldLimits[name]) errors[name] = `Máximo ${fieldLimits[name]} caracteres.`;
    }
    if (present) {
      for (const name of Object.keys(values) as FieldName[]) {
        if (!values[name]) errors[name] = 'Completa este campo.';
      }
      if (values.applicantDocumentType && !['DNI', 'CE'].includes(values.applicantDocumentType)) {
        errors.applicantDocumentType = 'Selecciona DNI o carné de extranjería.';
      }
      if (values.applicantDocumentNumber) {
        if (values.applicantDocumentType === 'DNI' && !/^\d{8}$/.test(values.applicantDocumentNumber)) {
          errors.applicantDocumentNumber = 'El DNI debe tener 8 dígitos.';
        }
        if (values.applicantDocumentType === 'CE' && !/^[A-Z0-9]{1,20}$/.test(values.applicantDocumentNumber)) {
          errors.applicantDocumentNumber = 'El CE admite hasta 20 letras o dígitos.';
        }
      }
      if (values.applicantEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.applicantEmail)) {
        errors.applicantEmail = 'Ingresa un correo electrónico válido.';
      }
      if (values.applicantPhone && !/^\+?[0-9]{7,15}$/.test(values.applicantPhone)) {
        errors.applicantPhone = 'Ingresa entre 7 y 15 dígitos, con + internacional opcional.';
      }
    }
    setFieldErrors(errors);
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setError('Revisa los campos marcados.');
      document.getElementById(`request-${firstError}`)?.focus();
      return;
    }

    setAction(present ? 'present' : 'draft');
    let id = savedDraftId;
    let saved = false;
    try {
      if (id) {
        await api.patch(`/itse/${id}/draft`, values);
      } else {
        const response = await api.post<ItseRequest>('/itse/drafts', values);
        id = response.data.id;
        setSavedDraftId(id);
      }
      saved = true;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        await api.post(`/itse/${id}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setFile(null);
        setDocumentUploaded(true);
      }
      if (present) await api.post(`/itse/${id}/submit`);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const response = axios.isAxiosError<{ message?: string | string[]; errors?: FieldErrors }>(err)
        ? err.response?.data
        : undefined;
      const message = response?.message;
      if (response?.errors) {
        setFieldErrors(response.errors);
        document.getElementById(`request-${Object.keys(response.errors)[0]}`)?.focus();
      }
      setError(Array.isArray(message) ? message.join(', ') : message || 'No se pudo completar la operación. Inténtalo nuevamente.');
      // Keep the saved ID and entered values so retrying does not create another draft.
      if (saved) await onSuccess();
    } finally {
      setAction(null);
    }
  };

  const field = (name: FieldName, label: string, type = 'text', placeholder?: string) => {
    const props = {
      id: `request-${name}`,
      name,
      value: fields[name],
      required: true,
      'aria-invalid': Boolean(fieldErrors[name]),
      'aria-describedby': fieldErrors[name] ? `request-${name}-error` : undefined,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => changeField(name, e.target.value),
      style: { ...inputStyle, border: fieldErrors[name] ? '1px solid #dc2626' : inputStyle.border },
    };
    return (
      <div style={{ marginBottom: '1rem', flex: 1 }}>
        <label htmlFor={props.id} style={labelStyle}>{label} <span aria-hidden="true" style={{ color: '#dc2626' }}>*</span></label>
        {name === 'applicantDocumentType'
          ? <select {...props}>
              <option value="">Selecciona una opción</option>
              <option value="DNI">DNI</option>
              <option value="CE">Carné de extranjería</option>
            </select>
          : name === 'description'
          ? <textarea {...props} placeholder={placeholder} style={{ ...props.style, minHeight: '90px', fontFamily: 'inherit' }} />
          : <input {...props} type={type} placeholder={placeholder} />}
        {fieldErrors[name] && <p id={`request-${name}-error`} style={{ color: '#b91c1c', fontSize: '0.85rem', marginTop: '0.25rem' }}>{fieldErrors[name]}</p>}
      </div>
    );
  };

  return (
    <div style={overlayStyle}>
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="request-form-title"
        style={{ width: '520px', maxWidth: 'calc(100vw - 2rem)', maxHeight: '90vh', overflowY: 'auto', background: '#fff' }}>
        <h3 id="request-form-title" style={{ marginBottom: '1rem' }}>{draft ? 'Editar solicitud ITSE' : 'Nueva solicitud ITSE'}</h3>
        {error && <p role="alert" style={{ color: '#b91c1c', fontSize: '0.85rem' }}>{error}</p>}
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
          * Campos obligatorios para presentar. Puedes guardar un borrador incompleto.
          Al presentar comenzará el plazo de 9 días hábiles.
        </p>
        <form noValidate onSubmit={(e) => { e.preventDefault(); void save(true); }}>
          <fieldset disabled={loading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
            {field('title', 'Nombre del establecimiento', 'text', 'Ej: Local Comercial A-102')}
            {field('description', 'Descripción de la solicitud')}
            <h4>Datos del solicitante</h4>
            {field('applicantName', 'Nombre completo')}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {field('applicantDocumentType', 'Tipo de documento')}
              {field('applicantDocumentNumber', 'Número de documento')}
            </div>
            {field('applicantEmail', 'Correo electrónico', 'email')}
            {field('applicantPhone', 'Teléfono', 'tel')}
            <h4>Datos del establecimiento</h4>
            {field('establishmentAddress', 'Dirección')}
            {field('establishmentDistrict', 'Distrito')}
            <div style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="request-file" style={labelStyle}>Adjuntar documento (PDF / Imagen)</label>
              <input id="request-file" type="file" accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setDocumentUploaded(false); }} style={inputStyle} />
              {documentUploaded && <p>Documento adjuntado al borrador.</p>}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button type="button" onClick={onClose} style={btnSecondaryStyle}>Cancelar</button>
              <button type="button" onClick={() => void save(false)} style={btnSecondaryStyle}>
                {action === 'draft' ? 'Guardando...' : 'Guardar borrador'}
              </button>
              <button type="submit" className="btn-primary">{action === 'present' ? 'Presentando...' : 'Presentar solicitud'}</button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1' };
const btnSecondaryStyle: React.CSSProperties = { padding: '0.6rem 1rem', background: '#f1f5f9', border: 'none', borderRadius: '4px', cursor: 'pointer' };
