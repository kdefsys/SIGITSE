/*import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000', // URL del backend NestJS
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para inyectar automáticamente el Bearer Token en cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
*/
import axios from 'axios';
import { Role, RequestStatus } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// MOCK TEMPORAL: Intercepta las peticiones para responder datos de prueba
api.interceptors.request.use(async (config) => {
  return config;
});

// Mock de respuestas
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config.url;

    // Simular Login exitoso
    if (url.includes('/auth/login')) {
      return Promise.resolve({
        data: {
          access_token: 'mock-jwt-token-12345',
          user: { id: 1, email: 'admin@uni.edu.pe', role: Role.INSPECTOR },
        },
      });
    }

    // Simular lista de Solicitudes ITSE de prueba
    if (url.includes('/itse') && error.config.method === 'get') {
      return Promise.resolve({
        data: [
          { id: 1, title: 'Inspección Local Comercial A-101', status: RequestStatus.PENDIENTE, createdAt: '2026-10-22' },
          { id: 2, title: 'Evaluación Edificio Central UNI', status: RequestStatus.EN_REVISION, createdAt: '2026-10-21' },
          { id: 3, title: 'Licencia Establecimiento Gastronómico', status: RequestStatus.APROBADO, createdAt: '2026-10-20' },
        ],
      });
    }

    // Simular respuestas exitosas para Modales (POST/PATCH)
    return Promise.resolve({
      data: { message: 'Operación simulada con éxito' },
    });
  }
);

export default api;
