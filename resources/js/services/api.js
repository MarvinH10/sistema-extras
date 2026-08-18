import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Interceptor para inyectar token de autorización
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('kdosh_auth_token');
  if (token) {
    config.headers['Authorization'] = 'Bearer ' + token;
    config.headers['X-Auth-Token'] = token;
  }
  return config;
});

// Interceptor para manejar expiración de sesión (4 horas)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const wasLoggedIn = Boolean(localStorage.getItem('kdosh_auth_token'));
      localStorage.removeItem('kdosh_auth_token');
      localStorage.removeItem('kdosh_user');
      localStorage.removeItem('kdosh_expires_at');
      if (wasLoggedIn && !window.location.pathname.includes('/login')) {
        window.dispatchEvent(new Event('kdosh_auth_expired'));
      }
    }
    return Promise.reject(error);
  }
);

// Auth Services
export const login = (email, password) => api.post('/auth/login', { email, password });
export const logout = () => api.post('/auth/logout');
export const getMe = () => api.get('/auth/me');

// Areas
export const getAreas = () => api.get('/areas');
export const createArea = (data) => api.post('/areas', data);
export const updateArea = (id, data) => api.put('/areas/' + id, data);
export const deleteArea = (id) => api.delete('/areas/' + id);

// Turnos
export const getTurnos = () => api.get('/turnos');

// Empleados
export const getEmpleados = (params) => api.get('/empleados', { params });
export const reordenarEmpleados = (ordenes) => api.post('/empleados/reordenar', { ordenes });
export const createEmpleado = (data) => api.post('/empleados', data);
export const updateEmpleado = (id, data) => api.put('/empleados/' + id, data);
export const deleteEmpleado = (id) => api.delete('/empleados/' + id);

// Asistencias
export const getAsistenciaDiaria = (fecha, area_id) => api.get('/asistencias/diaria', { params: { fecha, area_id } });
export const guardarAsistenciasLote = (fecha, registros) => api.post('/asistencias/guardar-lote', { fecha, registros });

// Registros
export const guardarRegistroIndividual = (data) => api.post('/registros', data);
export const previewCalculo = (data) => api.post('/registros/preview', data);

// Reportes
export const getReporteMensual = (anio, mes, area_id) => api.get('/reportes/mensual', { params: { anio, mes, area_id } });
export const getExportUrl = (anio, mes) => '/api/reportes/mensual/export?anio=' + anio + '&mes=' + mes;

export default api;
