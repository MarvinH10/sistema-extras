import React, { useState, useEffect } from 'react';
import { getEmpleados, createEmpleado, updateEmpleado, deleteEmpleado, getAreas, getTurnos, reordenarEmpleados } from '../services/api';
import Modal from '../components/Modal';
import { Users, Plus, Search, Filter, Edit2, Trash2, CheckCircle, XCircle, UserCheck, GripVertical } from 'lucide-react';

export default function EmpleadosView() {
  const [empleados, setEmpleados] = useState([]);
  const [areas, setAreas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggedEmpIndex, setDraggedEmpIndex] = useState(null);
  const [dragOverEmpIndex, setDragOverEmpIndex] = useState(null);
  const [canDragEmpId, setCanDragEmpId] = useState(null);

  const [search, setSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedTurno, setSelectedTurno] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [formValues, setFormValues] = useState({
    dni: '',
    nombres: '',
    cargo: '',
    area_id: '',
    turno_id: '',
    activo: true,
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [empRes, areaRes, turnoRes] = await Promise.all([
        getEmpleados({ search, area_id: selectedArea, turno_id: selectedTurno }),
        getAreas(),
        getTurnos(),
      ]);
      setEmpleados(empRes.data);
      setAreas(areaRes.data);
      setTurnos(turnoRes.data);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, selectedArea, selectedTurno]);

  const handleOpenCreate = () => {
    setEditingEmp(null);
    setFormValues({
      dni: '',
      nombres: '',
      cargo: '',
      area_id: areas[0]?.id || '',
      turno_id: turnos[0]?.id || '',
      activo: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmp(emp);
    setFormValues({
      dni: emp.dni,
      nombres: emp.nombres,
      cargo: emp.cargo || '',
      area_id: emp.area_id,
      turno_id: emp.turno_id,
      activo: emp.activo,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingEmp) {
        await updateEmpleado(editingEmp.id, formValues);
      } else {
        await createEmpleado(formValues);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Error guardando empleado:', err);
      alert(err.response?.data?.message || 'Error al guardar el empleado. Revisa el DNI.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${emp.nombres}?`)) return;
    try {
      await deleteEmpleado(emp.id);
      loadData();
    } catch (err) {
      console.error('Error eliminando empleado:', err);
      alert('No se pudo eliminar el empleado.');
    }
  };

  const handleEmpDragStart = (e, index) => {
    setDraggedEmpIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', String(index));
    } catch {}
  };

  const handleEmpDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedEmpIndex === null) return;
    if (dragOverEmpIndex !== index) {
      setDragOverEmpIndex(index);
    }
  };

  const handleEmpDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedEmpIndex === null || draggedEmpIndex === targetIndex) {
      setDraggedEmpIndex(null);
      setDragOverEmpIndex(null);
      return;
    }

    const emps = [...empleados];
    const [moved] = emps.splice(draggedEmpIndex, 1);
    emps.splice(targetIndex, 0, moved);

    setEmpleados(emps);
    setDraggedEmpIndex(null);
    setDragOverEmpIndex(null);

    const ordenes = emps.map((item, idx) => ({ id: item.id, orden: idx }));
    try {
      await reordenarEmpleados(ordenes);
    } catch (err) {
      console.error('Error guardando nuevo orden:', err);
    }
  };

  const handleEmpDragEnd = () => {
    setDraggedEmpIndex(null);
    setDragOverEmpIndex(null);
    setCanDragEmpId(null);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <Users size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">Directorio de Personal</h2>
              <p className="text-xs text-slate-400">
                Gestión de empleados, cargos, áreas de trabajo y turnos asignados (arrastra las filas para reordenar)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all"
        >
          <Plus size={16} />
          <span>Nuevo Personal</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Buscar por DNI, Nombres o Cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">Todas las Áreas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5">
            <select
              value={selectedTurno}
              onChange={(e) => setSelectedTurno(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-400">Todos los Turnos</option>
              {turnos.map(t => (
                <option key={t.id} value={t.id} className="bg-slate-900 text-slate-200">
                  {t.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="glass-panel p-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-medium">Cargando directorio...</span>
        </div>
      ) : empleados.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-400">
          No se encontraron colaboradores registrados con los filtros actuales.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl shadow-xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <th className="py-3 px-3 w-14 text-center">N°</th>
                  <th className="py-3 px-4 w-28 text-center font-mono">DNI</th>
                  <th className="py-3 px-4">Nombres y Apellidos</th>
                  <th className="py-3 px-4">Cargo</th>
                  <th className="py-3 px-4">Área</th>
                  <th className="py-3 px-4 text-center">Turno</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center w-24">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {empleados.map((emp, idx) => {
                  const isBeingDragged = draggedEmpIndex === idx;
                  const isDragOver = dragOverEmpIndex === idx;

                  return (
                    <tr 
                      key={emp.id} 
                      draggable={false}
                      onDragOver={(e) => handleEmpDragOver(e, idx)}
                      onDrop={(e) => handleEmpDrop(e, idx)}
                      className={`transition-colors duration-150 ${
                        isBeingDragged
                          ? 'opacity-40 bg-slate-900 border border-dashed border-indigo-500'
                          : isDragOver
                          ? 'border-t-2 border-indigo-500 bg-indigo-950/40 shadow-[0_-4px_12px_rgba(99,102,241,0.25)]'
                          : 'hover:bg-slate-900/40'
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-500 font-mono text-xs select-none">
                        <div className="flex items-center justify-center gap-0.5">
                          <span 
                            draggable={true}
                            onDragStart={(e) => {
                              e.stopPropagation();
                              handleEmpDragStart(e, idx);
                            }}
                            onDragEnd={handleEmpDragEnd}
                            className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-indigo-400 p-1 -m-0.5 rounded-md hover:bg-slate-800 transition"
                            title="Arrastra desde aquí para mover de posición a este personal"
                          >
                            <GripVertical size={14} />
                          </span>
                          <span>{idx + 1}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-medium text-slate-300">{emp.dni}</td>
                      <td className="py-3 px-4 font-semibold text-white">{emp.nombres}</td>
                      <td className="py-3 px-4 text-slate-300">{emp.cargo || '-'}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700">
                          {emp.area?.nombre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md inline-block ${
                          emp.turno?.nombre === 'TARDE'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : emp.turno?.nombre === 'COMPARTIDO'
                            ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {emp.turno?.nombre}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {emp.activo ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <CheckCircle size={14} /> Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-500 text-xs font-medium">
                            <XCircle size={14} /> Inactivo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-indigo-300 hover:bg-slate-700 transition"
                            title="Editar empleado"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-700 transition"
                            title="Eliminar empleado"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingEmp ? "Editar Datos del Empleado" : "Registrar Nuevo Empleado"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                DNI / Documento *
              </label>
              <input
                type="text"
                required
                value={formValues.dni}
                onChange={(e) => setFormValues({ ...formValues, dni: e.target.value })}
                placeholder="Ej. 74125896"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Cargo / Puesto
              </label>
              <input
                type="text"
                value={formValues.cargo}
                onChange={(e) => setFormValues({ ...formValues, cargo: e.target.value })}
                placeholder="Ej. Cajera / Reponedor"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Nombres y Apellidos *
            </label>
            <input
              type="text"
              required
              value={formValues.nombres}
              onChange={(e) => setFormValues({ ...formValues, nombres: e.target.value.toUpperCase() })}
              placeholder="Ej. APELLIDO PATERNO MATERNO, NOMBRES"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 uppercase"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Área de Trabajo *
              </label>
              <select
                required
                value={formValues.area_id}
                onChange={(e) => setFormValues({ ...formValues, area_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Seleccione Área...</option>
                {areas.map(a => (
                  <option key={a.id} value={a.id}>{a.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Turno Asignado *
              </label>
              <select
                required
                value={formValues.turno_id}
                onChange={(e) => setFormValues({ ...formValues, turno_id: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="">Seleccione Turno...</option>
                {turnos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nombre} ({t.entrada_base?.substring(0, 5)} - {t.salida_base?.substring(0, 5)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="empActivo"
              checked={formValues.activo}
              onChange={(e) => setFormValues({ ...formValues, activo: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
            />
            <label htmlFor="empActivo" className="text-xs font-medium text-slate-300 cursor-pointer">
              Empleado Activo en Planilla
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {saving ? 'Guardando...' : (editingEmp ? 'Actualizar' : 'Crear Empleado')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
