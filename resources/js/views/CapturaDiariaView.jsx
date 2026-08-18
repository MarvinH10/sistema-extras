import React, { useState, useEffect, useRef } from 'react';
import { getAsistenciaDiaria, guardarAsistenciasLote, getAreas, reordenarEmpleados } from '../services/api';
import TimeInput from '../components/TimeInput';
import {
  Calendar as CalendarIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Coffee,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Filter,
  Layers,
  ShieldCheck,
  Check,
  GripVertical,
  Eye,
  EyeOff
} from 'lucide-react';

export default function CapturaDiariaView({ onNavigateToMatriz }) {
  const [fecha, setFecha] = useState(() => {
    return localStorage.getItem('kextras_selected_date') || new Date().toISOString().split('T')[0];
  });
  const [areaId, setAreaId] = useState(() => {
    return localStorage.getItem('kextras_selected_area') || '';
  });
  const [areas, setAreas] = useState([]);
  const [dataAreas, setDataAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [formData, setFormData] = useState({});
  const [draggedItem, setDraggedItem] = useState(null); // { areaId, index }
  const [dragOverItem, setDragOverItem] = useState(null); // { areaId, index }
  const [canDragId, setCanDragId] = useState(null);
  const [hiddenAreas, setHiddenAreas] = useState(() => {
    try {
      const saved = localStorage.getItem('kextras_hidden_areas');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const dateInputRef = useRef(null);

  const toggleAreaHidden = (aId) => {
    setHiddenAreas(prev => {
      const next = prev.includes(aId) ? prev.filter(id => id !== aId) : [...prev, aId];
      try {
        localStorage.setItem('kextras_hidden_areas', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleExpandAll = () => {
    setHiddenAreas([]);
    try {
      localStorage.setItem('kextras_hidden_areas', JSON.stringify([]));
    } catch {}
  };

  const handleCollapseAll = () => {
    const allIds = dataAreas.map(a => a.id);
    setHiddenAreas(allIds);
    try {
      localStorage.setItem('kextras_hidden_areas', JSON.stringify(allIds));
    } catch {}
  };

  const isAreaHidden = (aId) => hiddenAreas.includes(aId);

  useEffect(() => {
    if (fecha) {
      localStorage.setItem('kextras_selected_date', fecha);
    }
  }, [fecha]);

  useEffect(() => {
    localStorage.setItem('kextras_selected_area', areaId);
  }, [areaId]);

  useEffect(() => {
    getAreas().then(res => setAreas(res.data)).catch(console.error);
  }, []);

  const loadDailyData = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const res = await getAsistenciaDiaria(fecha, areaId);
      setDataAreas(res.data.areas || []);

      const initialForm = {};
      (res.data.areas || []).forEach(area => {
        area.empleados.forEach(emp => {
          const reg = emp.registro;
          const isSinRestr = Boolean(reg?.sin_restricciones) || reg?.turno_detectado === 'SIN_RESTRICCIONES';
          
          let turnoManual = 'AUTO';
          if (isSinRestr) {
            turnoManual = 'SIN_RESTRICCIONES';
          } else if (reg?.turno_detectado) {
            turnoManual = reg.turno_detectado;
          }

          initialForm[emp.id] = {
            empleado_id: emp.id,
            turno_manual: turnoManual,
            sin_restricciones: isSinRestr,
            ingreso_1: reg?.ingreso_1 || '',
            salida_1: reg?.salida_1 || '',
            ingreso_2: reg?.ingreso_2 || '',
            salida_2: reg?.salida_2 || '',
            es_descanso: Boolean(reg?.es_descanso),
            observaciones: reg?.observaciones || '',
            minutos_trabajados: reg?.minutos_trabajados,
            minutos_extra: reg?.minutos_extra,
            incompleto: reg?.incompleto,
            turno_detectado: reg?.turno_detectado,
          };
        });
      });

      // Calcular en vivo
      Object.keys(initialForm).forEach(empId => {
        initialForm[empId] = recalculateClient(initialForm[empId]);
      });

      setFormData(initialForm);
    } catch (err) {
      console.error('Error cargando asistencias:', err);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadDailyData();
  }, [fecha, areaId]);

  function timeToMinutes(val) {
    if (!val || typeof val !== 'string') return null;
    const match = val.trim().match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  // Detección automática en cliente (solo turnos Full Time 8 horas)
  // Detección automática inteligente en cliente
  function detectarTurnoClient(i1, s1, i2, s2) {
    const i1Min = timeToMinutes(i1);
    if (i1Min === null) return 'TARDE';

    const s1Min = timeToMinutes(s1);
    const i2Min = timeToMinutes(i2);
    const s2Min = timeToMinutes(s2);

    // Si solo tiene entrada y salida (sin descanso intermedio)
    const salidaCorridaMin = s2Min !== null ? s2Min : s1Min;
    const soloEntradaSalida = (i1Min !== null && s2Min !== null && s1Min === null && i2Min === null) ||
                             (i1Min !== null && s1Min !== null && i2Min === null && s2Min === null);

    if (soloEntradaSalida && salidaCorridaMin !== null) {
      let fin = salidaCorridaMin;
      if (fin < i1Min) fin += 24 * 60;
      const duracion = fin - i1Min;

      // Jornada corta (hasta 5h30 / 330 min, ej ~4 horas) => PART_TIME
      if (duracion <= 330) {
        return 'PART_TIME';
      }
    }

    // Si ingresa al mediodía / tarde (11:45 en adelante, ej 12:40, 13:00, 16:10) => TARDE
    if (i1Min >= 11 * 60 + 45) {
      return 'TARDE';
    }

    // Si ingresa en la mañana
    if (s1Min !== null && i2Min !== null) {
      let durBreak = i2Min - s1Min;
      if (durBreak < 0) durBreak += 24 * 60;

      if (durBreak >= 180) {
        return 'COMPARTIDO';
      }
      return 'TODO_EL_DIA';
    }

    return 'COMPARTIDO';
  }

  // Recálculo rápido en el cliente con detección automática o manual o sin restricciones o part time
  function recalculateClient(item) {
    if (item.es_descanso) {
      return { 
        ...item, 
        calcWorked: 0, 
        calcExtra: 0, 
        isIncomplete: false, 
        calcTurno: item.turno_manual !== 'AUTO' ? item.turno_manual : 'TARDE',
        sin_restricciones: false,
      };
    }

    const { ingreso_1: i1, salida_1: s1, ingreso_2: i2, salida_2: s2, turno_manual, sin_restricciones } = item;
    const isSinRestricciones = sin_restricciones || turno_manual === 'SIN_RESTRICCIONES';
    const turnoDetectado = isSinRestricciones 
      ? 'SIN_RESTRICCIONES' 
      : ((turno_manual && turno_manual !== 'AUTO') ? turno_manual : detectarTurnoClient(i1, s1, i2, s2));

    const i1Total = timeToMinutes(i1);
    const s1Total = timeToMinutes(s1);
    const i2Total = timeToMinutes(i2);
    let s2Total = timeToMinutes(s2);

    if (i1Total === null && s1Total === null && i2Total === null && s2Total === null) {
      return { 
        ...item, 
        calcWorked: null, 
        calcExtra: null, 
        isIncomplete: false, 
        calcTurno: turnoDetectado,
        sin_restricciones: isSinRestricciones,
      };
    }

    // Jornada corrida (solo 2 marcas: entrada y salida sin descanso)
    const soloEntradaSalida = (i1Total !== null && s2Total !== null && s1Total === null && i2Total === null) ||
                             (i1Total !== null && s1Total !== null && i2Total === null && s2Total === null);

    if (soloEntradaSalida) {
      const salidaMin = s2Total !== null ? s2Total : s1Total;
      let fin = salidaMin;
      if (fin < i1Total) fin += 24 * 60;
      const totalTrabajados = Math.max(0, fin - i1Total);

      const esPartTime = (turno_manual === 'PART_TIME') || (turno_manual === 'AUTO' && totalTrabajados <= 330) || (turnoDetectado === 'PART_TIME');

      if (esPartTime) {
        const totalExtras = totalTrabajados - 240; // 4 horas base
        return {
          ...item,
          calcWorked: totalTrabajados,
          calcExtra: totalExtras,
          isIncomplete: false,
          calcTurno: 'PART_TIME',
          sin_restricciones: false,
        };
      } else {
        // Jornada corrida larga (~8 horas) => SIN RESTRICCIONES (base 480 min)
        const totalExtras = totalTrabajados - 480;
        return {
          ...item,
          calcWorked: totalTrabajados,
          calcExtra: totalExtras,
          isIncomplete: false,
          calcTurno: turno_manual !== 'AUTO' ? turno_manual : 'SIN_RESTRICCIONES',
          sin_restricciones: true,
        };
      }
    }

    // CASO PART TIME EXPLICITO con 4 marcas (o modo forzado)
    if (turno_manual === 'PART_TIME' || turnoDetectado === 'PART_TIME') {
      const entradaMin = i1Total;
      const salidaMin = s2Total !== null ? s2Total : s1Total;

      if (entradaMin === null || salidaMin === null) {
        return {
          ...item,
          calcWorked: null,
          calcExtra: null,
          isIncomplete: true,
          calcTurno: 'PART_TIME',
          sin_restricciones: false,
        };
      }

      let fin = salidaMin;
      if (fin < entradaMin) fin += 24 * 60;
      const totalTrabajados = Math.max(0, fin - entradaMin);
      const totalExtras = totalTrabajados - 240; // 4 horas base

      return {
        ...item,
        calcWorked: totalTrabajados,
        calcExtra: totalExtras,
        isIncomplete: false,
        calcTurno: 'PART_TIME',
        sin_restricciones: false,
      };
    }

    if (i1Total === null || s1Total === null || i2Total === null || s2Total === null) {
      return { 
        ...item, 
        calcWorked: null, 
        calcExtra: null, 
        isIncomplete: true, 
        calcTurno: turnoDetectado,
        sin_restricciones: isSinRestricciones,
      };
    }

    try {
      // MODO SIN RESTRICCIONES (Hora real punto a punto)
      if (isSinRestricciones) {
        if (s2Total < i2Total) s2Total += 24 * 60;
        let s1Tot = s1Total;
        if (s1Tot < i1Total) s1Tot += 24 * 60;

        const sesion1 = Math.max(0, s1Tot - i1Total);
        const sesion2 = Math.max(0, s2Total - i2Total);
        const totalTrabajados = sesion1 + sesion2;
        const totalExtras = totalTrabajados - 480;

        return {
          ...item,
          calcWorked: totalTrabajados,
          calcExtra: totalExtras,
          isIncomplete: false,
          calcTurno: 'SIN_RESTRICCIONES',
          sin_restricciones: true,
        };
      }

      // MODO REGLAS ESTÁNDAR (8 horas)
      if (s2Total < i2Total) {
        s2Total += 24 * 60; // Cruce de medianoche
      }

      let ingresoEfectivo = i1Total;
      let regresoEfectivo = i2Total;

      let sesion1 = 0;
      let sesion2 = 0;

      if (turnoDetectado === 'COMPARTIDO') {
        // Mañana: Base 09:00 a 13:00 (tope 13:00 para corte de refrigerio)
        ingresoEfectivo = i1Total <= 9 * 60 ? 9 * 60 : i1Total;
        const salidaEfectivaMañana = s1Total >= 13 * 60 ? 13 * 60 : s1Total;
        sesion1 = Math.max(0, salidaEfectivaMañana - ingresoEfectivo);

        // Tarde: Base 18:00 a 22:00 (si regresa 18:01 cuenta desde 18:01 descontando tardanza)
        regresoEfectivo = i2Total <= 18 * 60 ? 18 * 60 : i2Total;
        sesion2 = Math.max(0, s2Total - regresoEfectivo);
      } else if (turnoDetectado === 'TARDE') {
        // Base 13:00, break 1h desde salida
        ingresoEfectivo = i1Total <= 13 * 60 ? 13 * 60 : i1Total;
        const regresoMinimo = s1Total + 60;
        regresoEfectivo = i2Total < regresoMinimo ? regresoMinimo : i2Total;
        sesion1 = Math.max(0, s1Total - ingresoEfectivo);
        sesion2 = Math.max(0, s2Total - regresoEfectivo);
      } else {
        // TODO_EL_DIA: Base 09:00, break 1h desde salida
        ingresoEfectivo = i1Total <= 9 * 60 ? 9 * 60 : i1Total;
        const regresoMinimo = s1Total + 60;
        regresoEfectivo = i2Total < regresoMinimo ? regresoMinimo : i2Total;
        sesion1 = Math.max(0, s1Total - ingresoEfectivo);
        sesion2 = Math.max(0, s2Total - regresoEfectivo);
      }

      const totalTrabajados = sesion1 + sesion2;
      const totalExtras = totalTrabajados - 480;

      return {
        ...item,
        calcWorked: totalTrabajados,
        calcExtra: totalExtras,
        isIncomplete: false,
        calcTurno: turnoDetectado,
        sin_restricciones: false,
      };
    } catch {
      return {
        ...item,
        calcWorked: null,
        calcExtra: null,
        isIncomplete: true,
        calcTurno: turnoDetectado,
        sin_restricciones: isSinRestricciones,
      };
    }
  }

  const handleFieldChange = (empId, field, value) => {
    setFormData(prev => {
      let isSinRestr = prev[empId]?.sin_restricciones;
      if (field === 'turno_manual') {
        isSinRestr = value === 'SIN_RESTRICCIONES';
      }
      const updatedItem = {
        ...prev[empId],
        [field]: value,
        sin_restricciones: isSinRestr,
      };
      const recalculated = recalculateClient(updatedItem);
      return {
        ...prev,
        [empId]: recalculated,
      };
    });
  };

  const handleToggleSinRestricciones = (empId) => {
    setFormData(prev => {
      const current = prev[empId] || {};
      const nextSinRestr = !current.sin_restricciones;
      const updated = {
        ...current,
        sin_restricciones: nextSinRestr,
        turno_manual: nextSinRestr ? 'SIN_RESTRICCIONES' : 'AUTO',
      };
      return {
        ...prev,
        [empId]: recalculateClient(updated),
      };
    });
  };

  const handleApplyPreset = (empId, tipo) => {
    let i1 = '13:00', s1 = '17:00', i2 = '18:00', s2 = '22:00';
    if (tipo === 'COMPARTIDO') {
      i1 = '09:00'; s1 = '13:30'; i2 = '18:30'; s2 = '22:00';
    } else if (tipo === 'TODO_EL_DIA') {
      i1 = '09:00'; s1 = '14:00'; i2 = '15:00'; s2 = '22:00';
    } else if (tipo === 'PART_TIME') {
      i1 = '14:00'; s1 = ''; i2 = ''; s2 = '18:00';
    }

    setFormData(prev => {
      const updated = {
        ...prev[empId],
        turno_manual: tipo,
        sin_restricciones: false,
        ingreso_1: i1,
        salida_1: s1,
        ingreso_2: i2,
        salida_2: s2,
        es_descanso: false,
      };
      return {
        ...prev,
        [empId]: recalculateClient(updated),
      };
    });
  };

  const handleToggleDescanso = (empId) => {
    setFormData(prev => {
      const isDescanso = !prev[empId]?.es_descanso;
      const updated = {
        ...prev[empId],
        es_descanso: isDescanso,
        ingreso_1: isDescanso ? '' : prev[empId]?.ingreso_1,
        salida_1: isDescanso ? '' : prev[empId]?.salida_1,
        ingreso_2: isDescanso ? '' : prev[empId]?.ingreso_2,
        salida_2: isDescanso ? '' : prev[empId]?.salida_2,
      };
      return {
        ...prev,
        [empId]: recalculateClient(updated),
      };
    });
  };

  // Reordenar empleados arrastrando (Drag & Drop)
  const handleDragStart = (e, areaId, index) => {
    setDraggedItem({ areaId, index });
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', `${areaId}:${index}`);
    } catch {}
  };

  const handleDragOver = (e, areaId, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!draggedItem || draggedItem.areaId !== areaId) return;
    if (dragOverItem?.areaId !== areaId || dragOverItem?.index !== index) {
      setDragOverItem({ areaId, index });
    }
  };

  const handleDrop = async (e, areaId, targetIndex) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.areaId !== areaId) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    const sourceIndex = draggedItem.index;
    if (sourceIndex === targetIndex) {
      setDraggedItem(null);
      setDragOverItem(null);
      return;
    }

    // 1. Reordenar de inmediato localmente para respuesta instantánea
    const updatedAreas = dataAreas.map(area => {
      if (area.id !== areaId) return area;
      const emps = [...area.empleados];
      const [movedEmp] = emps.splice(sourceIndex, 1);
      emps.splice(targetIndex, 0, movedEmp);
      return { ...area, empleados: emps };
    });

    setDataAreas(updatedAreas);
    setDraggedItem(null);
    setDragOverItem(null);

    // 2. Guardar silenciosamente en la base de datos
    const targetArea = updatedAreas.find(a => a.id === areaId);
    if (targetArea) {
      const ordenes = targetArea.empleados.map((emp, idx) => ({
        id: emp.id,
        orden: idx,
      }));

      try {
        await reordenarEmpleados(ordenes);
        setToastMessage('✅ Posición guardada');
        setTimeout(() => setToastMessage(null), 2500);
      } catch (err) {
        console.error('Error guardando nuevo orden de personal:', err);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
    setCanDragId(null);
  };

  // Guardado silencioso sin perder la posición del scroll
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const registros = Object.values(formData).map(item => ({
        empleado_id: item.empleado_id,
        turno_nombre: item.turno_manual,
        sin_restricciones: Boolean(item.sin_restricciones || item.turno_manual === 'SIN_RESTRICCIONES'),
        ingreso_1: item.ingreso_1 || null,
        salida_1: item.salida_1 || null,
        ingreso_2: item.ingreso_2 || null,
        salida_2: item.salida_2 || null,
        es_descanso: Boolean(item.es_descanso),
        observaciones: item.observaciones || null,
      }));

      await guardarAsistenciasLote(fecha, registros);

      // Feedback discreto
      setToastMessage('✅ Marcajes guardados exitosamente');
      setTimeout(() => setToastMessage(null), 3000);

      // Recarga silenciosa en segundo plano sin desmontar la vista ni alterar el scroll
      await loadDailyData(true);
    } catch (err) {
      console.error('Error guardando asistencias:', err);
      setToastMessage('❌ Error al guardar los marcajes');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const changeDateBy = (days) => {
    const d = new Date(fecha + 'T00:00:00');
    d.setDate(d.getDate() + days);
    setFecha(d.toISOString().split('T')[0]);
  };

  const allItems = Object.values(formData);
  const totalEmpleados = allItems.length;
  const descansosCount = allItems.filter(i => i.es_descanso).length;
  const completosCount = allItems.filter(i => !i.es_descanso && i.calcWorked !== null).length;
  const incompletosCount = allItems.filter(i => !i.es_descanso && i.isIncomplete).length;
  const totalMinutosExtraDia = allItems.reduce((acc, curr) => acc + (curr.calcExtra || 0), 0);

  return (
    <div className="space-y-5 pb-24 w-full">
      {/* Toast Notification Flotante */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div className="bg-slate-900/95 text-emerald-300 px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/40 font-semibold text-xs flex items-center gap-2 backdrop-blur-md">
            <CheckCircle2 size={16} className="text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="glass-card rounded-2xl p-5 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <CalendarIcon className="text-indigo-400" size={22} />
            Captura Diaria de Asistencia y Horas Extra
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Turnos dinámicos por día: cálculo automático en vivo, soporte de horas reales sin restricciones (⚡) y guardado silencioso continuo
          </p>
        </div>

        {/* Date Selector & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-1 shadow-inner transition">
            <button
              type="button"
              onClick={() => changeDateBy(-1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Día anterior"
            >
              <ChevronLeft size={16} />
            </button>

            <div
              onClick={() => {
                try {
                  dateInputRef.current?.showPicker?.();
                } catch {
                  dateInputRef.current?.focus?.();
                }
              }}
              className="flex items-center gap-2 px-3 py-1 cursor-pointer group hover:bg-slate-800/60 rounded-lg transition"
              title="Clic para cambiar fecha"
            >
              <input
                ref={dateInputRef}
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer tracking-wider w-26.25 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
              />
              <CalendarIcon size={16} className="text-white group-hover:text-indigo-300 transition shrink-0" />
            </div>

            <button
              type="button"
              onClick={() => changeDateBy(1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Día siguiente"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            onClick={() => setFecha(new Date().toISOString().split('T')[0])}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            Hoy
          </button>

          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-1.5 shadow-inner">
            <Filter size={14} className="text-slate-400" />
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-200 outline-none cursor-pointer min-w-37.5"
            >
              <option value="" className="bg-slate-900 text-slate-200">Todas las Áreas (15)</option>
              {areas.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Botones rápidos para expandir / ocultar todas las áreas */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
            <button
              type="button"
              onClick={handleExpandAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Expandir y mostrar todas las áreas"
            >
              Expandir Todo
            </button>
            <span className="text-slate-700">|</span>
            <button
              type="button"
              onClick={handleCollapseAll}
              className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
              title="Ocultar y colapsar todas las áreas"
            >
              Ocultar Todo
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="glass-card rounded-xl p-3.5 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total Personal</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{totalEmpleados}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Clock size={17} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Completados</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{completosCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={17} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Incompletos</div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">{incompletosCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <AlertCircle size={17} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Descansos</div>
            <div className="text-xl font-bold text-slate-300 font-mono mt-0.5">{descansosCount}</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-slate-500/10 text-slate-400 flex items-center justify-center">
            <Coffee size={17} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800/80 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Saldo Extras Día</div>
            <div className={`text-xl font-bold font-mono mt-0.5 ${totalMinutosExtraDia >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalMinutosExtraDia > 0 ? `+${totalMinutosExtraDia}` : totalMinutosExtraDia} min
            </div>
          </div>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${totalMinutosExtraDia >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <Zap size={17} />
          </div>
        </div>
      </div>

      {/* Main Table by Area */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mb-3"></div>
          <p className="text-sm">Cargando hoja de asistencia diaria...</p>
        </div>
      ) : dataAreas.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-slate-400">
          No hay áreas ni empleados registrados para los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-6">
          {dataAreas.map((area) => {
            if (area.empleados.length === 0) return null;
            return (
              <div key={area.id} className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                {/* Area Header Bar */}
                <div className="bg-linear-to-r from-slate-900 via-slate-900/95 to-indigo-950/50 px-6 py-3.5 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full transition ${isAreaHidden(area.id) ? 'bg-slate-600' : 'bg-indigo-500 shadow-sm shadow-indigo-500/50'}`}></span>
                    <h3 className={`font-bold tracking-wide text-sm sm:text-base transition ${isAreaHidden(area.id) ? 'text-slate-400' : 'text-white'}`}>
                      {area.nombre}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      {area.empleados.length} colaboradores
                    </span>
                    {isAreaHidden(area.id) && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                        Oculto
                      </span>
                    )}
                  </div>

                  {/* Ojito Button */}
                  <button
                    type="button"
                    onClick={() => toggleAreaHidden(area.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                      isAreaHidden(area.id)
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:bg-slate-700'
                    }`}
                    title={isAreaHidden(area.id) ? "Mostrar colaboradores de este cargo" : "Ocultar colaboradores de este cargo en la plantilla"}
                  >
                    {isAreaHidden(area.id) ? (
                      <>
                        <EyeOff size={14} className="text-amber-400" />
                        <span>Mostrar</span>
                      </>
                    ) : (
                      <>
                        <Eye size={14} className="text-slate-400" />
                        <span>Ocultar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Table */}
                {!isAreaHidden(area.id) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-950/90 text-slate-400 font-semibold border-b border-slate-800">
                        <th className="py-3 px-4 w-12 text-center">N°</th>
                        <th className="py-3 px-4 min-w-55">Personal / Cargo</th>
                        <th className="py-3 px-3 min-w-42.5 text-center">
                          <div>Turno Día</div>
                          <div className="text-[10px] text-indigo-400 font-normal">Auto / Manual / Libre</div>
                        </th>
                        <th className="py-3 px-3 w-28 text-center">
                          <div className="font-medium text-slate-200">1. Ingreso</div>
                          <div className="text-[10px] text-slate-500 font-normal">Base / Real</div>
                        </th>
                        <th className="py-3 px-3 w-28 text-center">
                          <div className="font-medium text-slate-200">2. Salida Break</div>
                          <div className="text-[10px] text-slate-500 font-normal">Refrigerio</div>
                        </th>
                        <th className="py-3 px-3 w-28 text-center">
                          <div className="font-medium text-slate-200">3. Retorno Break</div>
                          <div className="text-[10px] text-slate-500 font-normal">Mín. obligatorio</div>
                        </th>
                        <th className="py-3 px-3 w-28 text-center">
                          <div className="font-medium text-slate-200">4. Salida Final</div>
                          <div className="text-[10px] text-slate-500 font-normal">Hora real</div>
                        </th>
                        <th className="py-3 px-3 w-32 text-center">Trabajado</th>
                        <th className="py-3 px-3 w-32 text-center">Extras (Min)</th>
                        <th className="py-3 px-3 min-w-52.5 text-center">Acciones / Presets</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {area.empleados.map((emp, idx) => {
                        const item = formData[emp.id] || {};
                        const isDescanso = item.es_descanso;
                        const isSinRestr = item.sin_restricciones || item.turno_manual === 'SIN_RESTRICCIONES';
                        const worked = item.calcWorked;
                        const extra = item.calcExtra;
                        const isIncomplete = item.isIncomplete;
                        const turnoName = item.calcTurno || 'TARDE';

                        const isBeingDragged = draggedItem?.areaId === area.id && draggedItem?.index === idx;
                        const isDragOver = dragOverItem?.areaId === area.id && dragOverItem?.index === idx;

                        return (
                          <tr
                            key={emp.id}
                            draggable={false}
                            onDragOver={(e) => handleDragOver(e, area.id, idx)}
                            onDrop={(e) => handleDrop(e, area.id, idx)}
                            className={`transition-colors duration-150 ${
                              isBeingDragged
                                ? 'opacity-40 bg-slate-900 border border-dashed border-indigo-500'
                                : isDragOver
                                ? 'border-t-2 border-indigo-500 bg-indigo-950/40 shadow-[0_-4px_12px_rgba(99,102,241,0.25)]'
                                : isDescanso
                                ? 'bg-slate-900/30 text-slate-500'
                                : isSinRestr
                                ? 'bg-amber-950/15 hover:bg-amber-950/25'
                                : 'hover:bg-slate-900/50'
                            }`}
                          >
                            {/* Index + Drag Handle (Solo arrastra desde los puntitos) */}
                            <td className="py-3 px-2 text-center text-slate-500 font-mono text-xs select-none">
                              <div className="flex items-center justify-center gap-0.5">
                                <span 
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    handleDragStart(e, area.id, idx);
                                  }}
                                  onDragEnd={handleDragEnd}
                                  className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-indigo-400 p-1 -m-0.5 rounded-md hover:bg-slate-800 transition"
                                  title="Arrastra desde aquí para mover de posición a este personal"
                                >
                                  <GripVertical size={14} />
                                </span>
                                <span>{idx + 1}</span>
                              </div>
                            </td>

                            {/* Employee Info */}
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-100 flex items-center gap-2">
                                {emp.nombres}
                              </div>
                              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-slate-500">DNI: {emp.dni}</span>
                                {emp.cargo && (
                                  <>
                                    <span>•</span>
                                    <span>{emp.cargo}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Flexible Turno Selector per Day */}
                            <td className="py-3 px-2 text-center">
                              <select
                                value={item.turno_manual || 'AUTO'}
                                onChange={(e) => handleFieldChange(emp.id, 'turno_manual', e.target.value)}
                                disabled={isDescanso}
                                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer transition w-full max-w-45 ${
                                  isSinRestr
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                                    : turnoName === 'TARDE'
                                    ? 'bg-blue-950/60 text-blue-300 border-blue-800'
                                    : turnoName === 'COMPARTIDO'
                                    ? 'bg-purple-950/60 text-purple-300 border-purple-800'
                                    : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                }`}
                              >
                                <option value="AUTO" className="bg-slate-900 text-slate-200">
                                  Auto ({turnoName === 'SIN_RESTRICCIONES' ? 'Sin Restr.' : turnoName})
                                </option>
                                <option value="TARDE" className="bg-slate-900 text-blue-300">TARDE (13:00-22:00)</option>
                                <option value="COMPARTIDO" className="bg-slate-900 text-purple-300">COMPARTIDO (09:00-22:00)</option>
                                <option value="TODO_EL_DIA" className="bg-slate-900 text-emerald-300">TODO EL DÍA (09:00-22:00)</option>
                                <option value="PART_TIME" className="bg-slate-900 text-cyan-300">PART TIME (4 Horas)</option>
                                <option value="SIN_RESTRICCIONES" className="bg-slate-900 text-amber-300 font-bold">⚡ SIN RESTRICCIONES (Hora Real)</option>
                              </select>
                            </td>

                            {/* Time 1: Ingreso */}
                            <td className="py-3 px-2 text-center">
                              <TimeInput
                                value={item.ingreso_1}
                                onChange={(val) => handleFieldChange(emp.id, 'ingreso_1', val)}
                                disabled={isDescanso}
                                placeholder="13:00"
                                className="w-22 mx-auto"
                              />
                            </td>

                            {/* Time 2: Salida Break */}
                            <td className="py-3 px-2 text-center">
                              <TimeInput
                                value={item.salida_1}
                                onChange={(val) => handleFieldChange(emp.id, 'salida_1', val)}
                                disabled={isDescanso}
                                placeholder="17:00"
                                className="w-22 mx-auto"
                              />
                            </td>

                            {/* Time 3: Retorno Break */}
                            <td className="py-3 px-2 text-center">
                              <TimeInput
                                value={item.ingreso_2}
                                onChange={(val) => handleFieldChange(emp.id, 'ingreso_2', val)}
                                disabled={isDescanso}
                                placeholder="18:00"
                                className="w-22 mx-auto"
                              />
                            </td>

                            {/* Time 4: Salida Final */}
                            <td className="py-3 px-2 text-center">
                              <TimeInput
                                value={item.salida_2}
                                onChange={(val) => handleFieldChange(emp.id, 'salida_2', val)}
                                disabled={isDescanso}
                                placeholder="22:00"
                                className="w-22 mx-auto"
                              />
                            </td>

                            {/* Worked Minutes */}
                            <td className="py-3 px-3 text-center">
                              {isDescanso ? (
                                <span className="text-xs font-medium text-slate-500">Descanso</span>
                              ) : worked !== null ? (
                                <div>
                                  <span className="font-mono font-bold text-slate-200">
                                    {worked}m
                                  </span>
                                  <span className="text-[10px] text-slate-500 block">
                                    ({Math.floor(worked / 60)}h {worked % 60}m)
                                  </span>
                                </div>
                              ) : isIncomplete ? (
                                <span className="text-[11px] text-amber-400 font-medium">Incompleto</span>
                              ) : (
                                <span className="text-xs text-slate-600">-</span>
                              )}
                            </td>

                            {/* Extra Minutes Badge */}
                            <td className="py-3 px-3 text-center">
                              {isDescanso ? (
                                <span className="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-400 font-mono">0</span>
                              ) : extra !== null ? (
                                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-tight shadow-sm ${
                                  extra > 0
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-emerald-500/10'
                                    : extra < 0
                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-rose-500/10'
                                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                                }`}>
                                  {extra > 0 ? `+${extra}` : extra} min
                                </span>
                              ) : isIncomplete ? (
                                <span className="text-amber-400 text-xs font-mono">--</span>
                              ) : (
                                <span className="text-slate-600 text-xs font-mono">0</span>
                              )}
                            </td>

                            {/* Actions / Preset Fillers + Sin Restricciones Toggle Button */}
                            <td className="py-3 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                {/* Botón Especial: Sin Restricciones (Hora Real Exacta) */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleSinRestricciones(emp.id)}
                                  disabled={isDescanso}
                                  title={
                                    isSinRestr
                                      ? "Actualmente en modo Sin Restricciones (calculando horas reales exactas). Clic para volver a reglas estándar."
                                      : "Clic para obviar restricciones (computar hora real exacta de llegada y descanso)"
                                  }
                                  className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                                    isSinRestr
                                      ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30 ring-1 ring-amber-300'
                                      : 'bg-slate-800 text-slate-400 hover:text-amber-300 hover:bg-slate-700 border border-slate-700'
                                  }`}
                                >
                                  <Zap size={12} className={isSinRestr ? "fill-current" : ""} />
                                  <span>{isSinRestr ? "Sin Restr." : "Libre"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleToggleDescanso(emp.id)}
                                  title={isDescanso ? "Quitar descanso" : "Marcar día de descanso"}
                                  className={`p-1.5 rounded-lg text-xs font-medium transition ${
                                    isDescanso
                                      ? 'bg-slate-700 text-white hover:bg-slate-600'
                                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                                  }`}
                                >
                                  <Coffee size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(emp.id, 'TARDE')}
                                  title="Llenar Tarde (13:00-22:00)"
                                  className="px-1.5 py-1 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition"
                                >
                                  Tarde
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(emp.id, 'COMPARTIDO')}
                                  title="Llenar Compartido (09:00-22:00, 5h break)"
                                  className="px-1.5 py-1 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition"
                                >
                                  Comp.
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(emp.id, 'PART_TIME')}
                                  title="Llenar Part Time (14:00-18:00, 4h corrida)"
                                  className="px-1.5 py-1 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition"
                                >
                                  Part
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Save Bar */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-30 w-full max-w-4xl px-4">
        <div className="glass-panel bg-slate-900/95 rounded-2xl p-4 shadow-2xl border border-indigo-500/30 flex items-center justify-between gap-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-400 border-t-transparent" />
              ) : (
                <Save size={18} />
              )}
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                Hoja de Asistencia del {fecha}
                {toastMessage && (
                  <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={14} /> Guardado
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Guardado silencioso continuo (mantiene tu posición en pantalla)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Guardar Marcajes del Día</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
