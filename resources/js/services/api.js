import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export const getAreas = () => api.get('/areas');
export const createArea = (data) => api.post('/areas', data);
export const updateArea = (id, data) => api.put(`/areas/${id}`, data);
export const deleteArea = (id) => api.delete(`/areas/${id}`);

export const getTurnos = () => api.get('/turnos');

export const getEmpleados = (params) => api.get('/empleados', { params });
export const reordenarEmpleados = (ordenes) => api.post('/empleados/reordenar', { ordenes });
export const createEmpleado = (data) => api.post('/empleados', data);
export const updateEmpleado = (id, data) => api.put(`/empleados/${id}`, data);
export const deleteEmpleado = (id) => api.delete(`/empleados/${id}`);

export const getAsistenciaDiaria = (fecha, area_id) => api.get('/asistencias/diaria', { params: { fecha, area_id } });
export const guardarAsistenciasLote = (fecha, registros) => api.post('/asistencias/guardar-lote', { fecha, registros });

export const guardarRegistroIndividual = (data) => api.post('/registros', data);
export const previewCalculo = (data) => api.post('/registros/preview', data);

export const getReporteMensual = (anio, mes, area_id) => api.get('/reportes/mensual', { params: { anio, mes, area_id } });
export const getExportUrl = (anio, mes) => `/api/reportes/mensual/export?anio=${anio}&mes=${mes}`;

export default api;
