import React, { useState, useEffect } from 'react';
import { getReporteMensual, getAreas, guardarRegistroIndividual, getExportUrl } from '../services/api';
import Modal from '../components/Modal';
import TimeInput from '../components/TimeInput';
import {
  FileSpreadsheet,
  Download,
  Filter,
  Calendar,
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  Edit3,
  Check,
  Coffee,
  Sparkles,
  Info
} from 'lucide-react';

export default function MatrizMensualView() {
  const currentDate = new Date();
  const [anio, setAnio] = useState(() => {
    const saved = localStorage.getItem('kextras_matriz_anio');
    return saved ? parseInt(saved, 10) : currentDate.getFullYear();
  });
  const [mes, setMes] = useState(() => {
    const saved = localStorage.getItem('kextras_matriz_mes');
    return saved ? parseInt(saved, 10) : (currentDate.getMonth() + 1);
  });
  const [areaId, setAreaId] = useState(() => {
    return localStorage.getItem('kextras_matriz_area') || '';
  });
  const [areas, setAreas] = useState([]);
  const [reporte, setReporte] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('kextras_matriz_anio', anio);
  }, [anio]);

  useEffect(() => {
    localStorage.setItem('kextras_matriz_mes', mes);
  }, [mes]);

  useEffect(() => {
    localStorage.setItem('kextras_matriz_area', areaId);
  }, [areaId]);

  // Modal para editar celda/día específico
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  // { empleado, dia, fecha, ingreso_1, salida_1, ingreso_2, salida_2, es_descanso, observaciones, calcWorked, calcExtra }
  const [modalSaving, setModalSaving] = useState(false);

  const meses = [
    { num: 1, nombre: 'Enero' },
    { num: 2, nombre: 'Febrero' },
    { num: 3, nombre: 'Marzo' },
    { num: 4, nombre: 'Abril' },
    { num: 5, nombre: 'Mayo' },
    { num: 6, nombre: 'Junio' },
    { num: 7, nombre: 'Julio' },
    { num: 8, nombre: 'Agosto' },
    { num: 9, nombre: 'Septiembre' },
    { num: 10, nombre: 'Octubre' },
    { num: 11, nombre: 'Noviembre' },
    { num: 12, nombre: 'Diciembre' },
  ];

  useEffect(() => {
    getAreas().then(res => setAreas(res.data)).catch(console.error);
  }, []);

  const loadReporte = async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const res = await getReporteMensual(anio, mes, areaId);
      setReporte(res.data);
    } catch (err) {
      console.error('Error cargando reporte mensual:', err);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadReporte();
  }, [anio, mes, areaId]);

  const handleCellClick = (emp, dia) => {
    const reg = emp.dias[dia];
    const fechaString = `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const isSinRestr = Boolean(reg?.sin_restricciones) || reg?.turno_detectado === 'SIN_RESTRICCIONES';

    const cellData = {
      empleado_id: emp.id,
      empleado_nombre: emp.nombres,
      empleado_dni: emp.dni,
      turno: emp.turno,
      turno_nombre: isSinRestr ? 'SIN_RESTRICCIONES' : (reg?.turno_detectado || 'AUTO'),
      sin_restricciones: isSinRestr,
      dia,
      fecha: fechaString,
      ingreso_1: reg?.ingreso_1 || '',
      salida_1: reg?.salida_1 || '',
      ingreso_2: reg?.ingreso_2 || '',
      salida_2: reg?.salida_2 || '',
      es_descanso: Boolean(reg?.es_descanso),
      observaciones: reg?.observaciones || '',
      minutos_trabajados: reg?.minutos_trabajados,
      minutos_extra: reg?.minutos_extra,
    };

    setSelectedCell(calculateModalPreview(cellData));
    setModalOpen(true);
  };

  function timeToMinutes(val) {
    if (!val || typeof val !== 'string') return null;
    const match = val.trim().match(/^(\d{1,2}):(\d{1,2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (isNaN(h) || isNaN(m) || h < 0 || h > 24 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function detectarTurnoClient(i1, s1, i2, s2) {
    const i1Min = timeToMinutes(i1);
    if (i1Min === null) return 'TARDE';

    const s1Min = timeToMinutes(s1);
    const i2Min = timeToMinutes(i2);
    const s2Min = timeToMinutes(s2);

    // Si solo tiene entrada y salida (sin descanso)
    const soloEntradaSalida = (i1Min !== null && s2Min !== null && s1Min === null && i2Min === null) ||
                             (i1Min !== null && s1Min !== null && i2Min === null && s2Min === null);

    if (soloEntradaSalida) {
      return 'PART_TIME';
    }

    // Si ingresa al mediodía / tarde (11:45 en adelante, ej 12:40, 13:00) => TARDE
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

  function calculateModalPreview(item) {
    if (item.es_descanso) {
      return { 
        ...item, 
        calcWorked: 0, 
        calcExtra: 0, 
        isIncomplete: false, 
        calcTurno: item.turno_nombre !== 'AUTO' ? item.turno_nombre : 'TARDE',
        sin_restricciones: false,
      };
    }
    const { ingreso_1: i1, salida_1: s1, ingreso_2: i2, salida_2: s2, turno_nombre, sin_restricciones } = item;
    const isSinRestricciones = sin_restricciones || turno_nombre === 'SIN_RESTRICCIONES';
    const turnoDetectado = isSinRestricciones 
      ? 'SIN_RESTRICCIONES' 
      : ((turno_nombre && turno_nombre !== 'AUTO') ? turno_nombre : detectarTurnoClient(i1, s1, i2, s2));

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

    // CASO PART TIME (4 horas = 240 minutos) - SOLO si se seleccionó explícitamente PART_TIME
    const isPartTime = turno_nombre === 'PART_TIME';
    if (isPartTime) {
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

    // Si solo tiene entrada y salida (sin descanso): jornada corrida Full Time (base 480 min = 8 horas)
    const soloEntradaSalida = (i1Total !== null && s2Total !== null && s1Total === null && i2Total === null) ||
                             (i1Total !== null && s1Total !== null && i2Total === null && s2Total === null);

    if (soloEntradaSalida) {
      const salidaMin = s2Total !== null ? s2Total : s1Total;
      let fin = salidaMin;
      if (fin < i1Total) fin += 24 * 60;
      const totalTrabajados = Math.max(0, fin - i1Total);
      const totalExtras = totalTrabajados - 480; // 8 horas base obligatorias

      return {
        ...item,
        calcWorked: totalTrabajados,
        calcExtra: totalExtras,
        isIncomplete: false,
        calcTurno: turnoDetectado,
        sin_restricciones: isSinRestricciones,
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

      const ebH = turnoDetectado === 'TARDE' ? 13 : 9;
      const ebTotal = ebH * 60;
      const breakMin = turnoDetectado === 'COMPARTIDO' ? 300 : 60;

      if (s2Total < i2Total) s2Total += 24 * 60;

      const ingresoEfectivo = i1Total <= ebTotal ? ebTotal : i1Total;
      const regresoMinimo = s1Total + breakMin;
      const regresoEfectivo = i2Total < regresoMinimo ? regresoMinimo : i2Total;

      const sesion1 = Math.max(0, s1Total - ingresoEfectivo);
      const sesion2 = Math.max(0, s2Total - regresoEfectivo);

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

  const handleModalFieldChange = (field, value) => {
    setSelectedCell(prev => {
      let isSinRestr = prev?.sin_restricciones;
      if (field === 'turno_nombre') {
        isSinRestr = value === 'SIN_RESTRICCIONES';
      }
      const updated = { 
        ...prev, 
        [field]: value,
        sin_restricciones: isSinRestr,
      };
      return calculateModalPreview(updated);
    });
  };

  const handleSaveModal = async () => {
    if (!selectedCell) return;
    setModalSaving(true);
    try {
      await guardarRegistroIndividual({
        empleado_id: selectedCell.empleado_id,
        fecha: selectedCell.fecha,
        turno_nombre: selectedCell.turno_nombre || 'AUTO',
        sin_restricciones: Boolean(selectedCell.sin_restricciones || selectedCell.turno_nombre === 'SIN_RESTRICCIONES'),
        ingreso_1: selectedCell.ingreso_1 || null,
        salida_1: selectedCell.salida_1 || null,
        ingreso_2: selectedCell.ingreso_2 || null,
        salida_2: selectedCell.salida_2 || null,
        es_descanso: selectedCell.es_descanso,
        observaciones: selectedCell.observaciones || null,
      });

      setModalOpen(false);
      await loadReporte(true);
    } catch (err) {
      console.error('Error guardando registro:', err);
      alert('Error al guardar el registro');
    } finally {
      setModalSaving(false);
    }
  };

  const getDayNameLetter = (dayNum) => {
    const d = new Date(anio, mes - 1, dayNum);
    const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    return letters[d.getDay()];
  };

  const isWeekend = (dayNum) => {
    const d = new Date(anio, mes - 1, dayNum);
    const day = d.getDay();
    return day === 0 || day === 6; // Domingo o Sábado
  };

  const totalDias = reporte?.total_dias || 31;
  const granTotal = reporte?.gran_total_minutos_extra || 0;
  const totalHorasEquiv = (granTotal / 60).toFixed(1);

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Controls */}
      <div className="glass-card rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <FileSpreadsheet size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white">
                Matriz Mensual de Horas Extra (En Minutos)
              </h2>
              <p className="text-xs text-slate-400">
                Formato oficial idéntico al Excel "EXTRAS DE AGOSTO POR MINUTO.xlsx"
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Download */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
            <Calendar size={14} className="text-indigo-400" />
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
            >
              {meses.map(m => (
                <option key={m.num} value={m.num} className="bg-slate-900 text-slate-200">
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
            >
              {[2025, 2026, 2027, 2028].map(y => (
                <option key={y} value={y} className="bg-slate-900 text-slate-200">{y}</option>
              ))}
            </select>
          </div>

          {/* Area Filter */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
            <Filter size={14} className="text-slate-400" />
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="bg-transparent text-xs text-slate-200 outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-slate-200">Todas las Áreas</option>
              {areas.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                  {a.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Export Excel Button */}
          <a
            href={getExportUrl(anio, mes)}
            download
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Download size={15} />
            <span>Descargar Excel (.xlsx)</span>
          </a>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Gran Total Minutos Extra</div>
            <div className={`text-2xl font-bold font-mono ${granTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {granTotal > 0 ? `+${granTotal}` : granTotal} min
            </div>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${granTotal >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            {granTotal >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Equivalente en Horas</div>
            <div className="text-2xl font-bold font-mono text-indigo-400">
              {totalHorasEquiv} hrs
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Personal Registrado</div>
            <div className="text-2xl font-bold text-white">
              {reporte?.total_empleados || 0}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
            <Users size={20} />
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">Días del Período</div>
            <div className="text-2xl font-bold text-slate-200">
              {totalDias} días
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Calendar size={20} />
          </div>
        </div>
      </div>

      {/* Interactive Matrix Table */}
      {loading ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-slate-400">
          <div className="inline-block animate-spin rounded-full h-9 w-9 border-t-2 border-b-2 border-indigo-500 mb-3"></div>
          <p>Generando matriz de horas extra del mes...</p>
        </div>
      ) : !reporte || reporte.areas.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center text-slate-400">
          No hay registros ni empleados para el mes y área seleccionados.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                {/* Main Table Header */}
                <tr className="bg-slate-900 text-slate-300 font-bold border-b border-slate-700">
                  <th className="py-3 px-3 w-10 text-center sticky left-0 bg-slate-900 z-20 border-r border-slate-800">
                    N°
                  </th>
                  <th className="py-3 px-3 min-w-48 sticky left-10 bg-slate-900 z-20 border-r border-slate-800 shadow-[4px_0_8px_rgba(0,0,0,0.5)]">
                    Nombres y Apellidos
                  </th>

                  {/* Day Columns 1 to 31 */}
                  {Array.from({ length: totalDias }, (_, i) => i + 1).map(dayNum => {
                    const weekend = isWeekend(dayNum);
                    return (
                      <th
                        key={dayNum}
                        className={`py-2 px-1 w-9 text-center border-r border-slate-800/80 ${
                          weekend ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-900 text-slate-200'
                        }`}
                      >
                        <div className="text-[10px] text-slate-500 font-normal">
                          {getDayNameLetter(dayNum)}
                        </div>
                        <div className="font-mono text-xs">{dayNum}</div>
                      </th>
                    );
                  })}

                  {/* Total Column */}
                  <th className="py-3 px-3 min-w-25 text-center bg-indigo-950/80 text-indigo-200 font-bold sticky right-0 z-20 border-l border-indigo-800/50 shadow-[-4px_0_8px_rgba(0,0,0,0.5)]">
                    TOTAL (MIN)
                  </th>
                </tr>
              </thead>

              <tbody>
                {reporte.areas.map((area) => {
                  if (area.empleados.length === 0) return null;

                  return (
                    <React.Fragment key={area.id}>
                      {/* Area Separator Header */}
                      <tr className="bg-slate-900/90 border-y border-indigo-900/40">
                        <td
                          colSpan={totalDias + 3}
                          className="py-2 px-4 font-bold text-xs text-indigo-300 tracking-wider uppercase bg-linear-to-r from-indigo-950/70 via-slate-900 to-transparent"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                            <span>Área: {area.nombre}</span>
                            <span className="text-[11px] font-normal text-slate-400 lowercase">
                              ({area.empleados.length} personal)
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Employees of Area */}
                      {area.empleados.map((emp, empIdx) => {
                        const totalEmpExtra = emp.total_minutos_extra;

                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-slate-800/40 border-b border-slate-800/50 transition-colors"
                          >
                            {/* Index */}
                            <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px] sticky left-0 bg-slate-950/90 z-10 border-r border-slate-800">
                              {empIdx + 1}
                            </td>

                            {/* Employee Names */}
                            <td className="py-2.5 px-3 sticky left-10 bg-slate-950/90 z-10 border-r border-slate-800 shadow-[4px_0_8px_rgba(0,0,0,0.5)]">
                              <div className="font-semibold text-slate-100 text-xs">
                                {emp.nombres}
                              </div>
                              <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <span>{emp.dni}</span>
                                {emp.cargo && (
                                  <>
                                    <span>•</span>
                                    <span>{emp.cargo}</span>
                                  </>
                                )}
                              </div>
                            </td>

                            {/* Day Cells 1..31 */}
                            {Array.from({ length: totalDias }, (_, i) => i + 1).map(dayNum => {
                              const dayData = emp.dias[dayNum];
                              const minExtra = dayData?.minutos_extra;
                              const isDescanso = dayData?.es_descanso;
                              const weekend = isWeekend(dayNum);

                              let cellClass = "cursor-pointer transition hover:scale-105 select-none ";
                              let cellContent = "";

                              if (isDescanso) {
                                cellClass += "bg-slate-800/60 text-slate-400 font-semibold";
                                cellContent = "D";
                              } else if (minExtra !== null && minExtra !== undefined) {
                                if (minExtra > 0) {
                                  cellClass += "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30";
                                  cellContent = `+${minExtra}`;
                                } else if (minExtra < 0) {
                                  cellClass += "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30";
                                  cellContent = `${minExtra}`;
                                } else {
                                  cellClass += "text-slate-500 font-medium";
                                  cellContent = "0";
                                }
                              } else {
                                cellClass += weekend ? "bg-slate-950/30 text-slate-600" : "text-slate-600 hover:bg-slate-800/50";
                                cellContent = "-";
                              }

                              return (
                                <td
                                  key={dayNum}
                                  onClick={() => handleCellClick(emp, dayNum)}
                                  className={`py-2 px-0.5 text-center border-r border-slate-800/60 ${cellClass}`}
                                  title={`Clic para editar marcaje del día ${dayNum} (${emp.nombres})`}
                                >
                                  <span className="text-[11px] block">{cellContent}</span>
                                </td>
                              );
                            })}

                            {/* Row Total */}
                            <td className="py-2.5 px-3 text-center sticky right-0 bg-slate-950/95 z-10 border-l border-indigo-900/40 shadow-[-4px_0_8px_rgba(0,0,0,0.5)]">
                              <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md inline-block ${
                                totalEmpExtra > 0
                                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                                  : totalEmpExtra < 0
                                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400'
                              }`}>
                                {totalEmpExtra > 0 ? `+${totalEmpExtra}` : totalEmpExtra}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}

                {/* Footer Totals Row */}
                <tr className="bg-slate-900/90 font-bold border-t-2 border-indigo-500/40">
                  <td
                    colSpan={2}
                    className="py-3 px-4 text-right text-xs uppercase tracking-wider text-slate-300 sticky left-0 bg-slate-900 z-20 border-r border-slate-800 shadow-[4px_0_8px_rgba(0,0,0,0.5)]"
                  >
                    TOTAL DÍA (MIN):
                  </td>

                  {/* Day Sums */}
                  {Array.from({ length: totalDias }, (_, i) => i + 1).map(dayNum => {
                    const sumDay = reporte.totales_por_dia?.[dayNum] || 0;
                    return (
                      <td
                        key={dayNum}
                        className={`py-2 px-0.5 text-center font-mono text-[11px] border-r border-slate-800/80 ${
                          sumDay > 0
                            ? 'text-emerald-400 bg-emerald-950/30'
                            : sumDay < 0
                            ? 'text-rose-400 bg-rose-950/30'
                            : 'text-slate-500'
                        }`}
                      >
                        {sumDay !== 0 ? (sumDay > 0 ? `+${sumDay}` : sumDay) : '-'}
                      </td>
                    );
                  })}

                  {/* Gran Total */}
                  <td className="py-3 px-3 text-center sticky right-0 bg-indigo-950 z-20 border-l border-indigo-700 shadow-[-4px_0_8px_rgba(0,0,0,0.5)]">
                    <span className={`font-mono text-sm font-black ${
                      granTotal >= 0 ? 'text-emerald-300' : 'text-rose-300'
                    }`}>
                      {granTotal > 0 ? `+${granTotal}` : granTotal}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Cell Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`Marcajes del Día ${selectedCell?.dia} de ${reporte?.nombre_mes || 'Mes'} - ${selectedCell?.empleado_nombre}`}
      >
        {selectedCell && (
          <div className="space-y-5">
            {/* Header info */}
            <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-semibold text-white text-sm">{selectedCell.empleado_nombre}</div>
                <div className="text-xs text-slate-400">DNI: {selectedCell.empleado_dni}</div>
              </div>
              <div className="text-right">
                <select
                  value={selectedCell.turno_nombre || 'AUTO'}
                  onChange={(e) => handleModalFieldChange('turno_nombre', e.target.value)}
                  className={`text-xs px-2.5 py-1 rounded-md border font-bold outline-none cursor-pointer ${
                    selectedCell.sin_restricciones || selectedCell.turno_nombre === 'SIN_RESTRICCIONES'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}
                >
                  <option value="AUTO" className="bg-slate-900 text-slate-200">Auto ({selectedCell.calcTurno === 'SIN_RESTRICCIONES' ? 'Sin Restr.' : (selectedCell.calcTurno || 'TARDE')})</option>
                  <option value="TARDE" className="bg-slate-900 text-blue-300">TARDE (13:00 - 22:00)</option>
                  <option value="COMPARTIDO" className="bg-slate-900 text-purple-300">COMPARTIDO (09:00 - 22:00)</option>
                  <option value="TODO_EL_DIA" className="bg-slate-900 text-emerald-300">TODO EL DÍA (09:00 - 22:00)</option>
                  <option value="PART_TIME" className="bg-slate-900 text-cyan-300 font-bold">PART TIME (4 Horas)</option>
                  <option value="SIN_RESTRICCIONES" className="bg-slate-900 text-amber-300 font-bold">⚡ SIN RESTRICCIONES (Hora Real)</option>
                </select>
                <div className="text-[11px] text-slate-500 mt-1">
                  Turno aplicado a esta fecha
                </div>
              </div>
            </div>

            {/* Switches Row: Descanso & Sin Restricciones */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Descanso Switch */}
              <div className="flex items-center gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="modalDescanso"
                  checked={selectedCell.es_descanso}
                  onChange={(e) => handleModalFieldChange('es_descanso', e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <label htmlFor="modalDescanso" className="text-xs font-medium text-slate-200 cursor-pointer flex items-center gap-2">
                  <Coffee size={15} className="text-slate-400" />
                  Día de Descanso (0 min)
                </label>
              </div>

              {/* Sin Restricciones Switch */}
              <div className="flex items-center gap-3 p-3 bg-amber-950/20 rounded-xl border border-amber-500/30">
                <input
                  type="checkbox"
                  id="modalSinRestr"
                  checked={Boolean(selectedCell.sin_restricciones || selectedCell.turno_nombre === 'SIN_RESTRICCIONES')}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    handleModalFieldChange('sin_restricciones', checked);
                    handleModalFieldChange('turno_nombre', checked ? 'SIN_RESTRICCIONES' : 'AUTO');
                  }}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <label htmlFor="modalSinRestr" className="text-xs font-semibold text-amber-200 cursor-pointer flex items-center gap-1.5">
                  <Zap size={15} className="text-amber-400 fill-current" />
                  Obviar Restricciones (Hora Real)
                </label>
              </div>
            </div>

            {!selectedCell.es_descanso && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    1. Ingreso
                  </label>
                  <TimeInput
                    value={selectedCell.ingreso_1}
                    onChange={(val) => handleModalFieldChange('ingreso_1', val)}
                    placeholder="13:00"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    2. Salida Break
                  </label>
                  <TimeInput
                    value={selectedCell.salida_1}
                    onChange={(val) => handleModalFieldChange('salida_1', val)}
                    placeholder="17:00"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    3. Retorno Break
                  </label>
                  <TimeInput
                    value={selectedCell.ingreso_2}
                    onChange={(val) => handleModalFieldChange('ingreso_2', val)}
                    placeholder="18:00"
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    4. Salida Final
                  </label>
                  <TimeInput
                    value={selectedCell.salida_2}
                    onChange={(val) => handleModalFieldChange('salida_2', val)}
                    placeholder="22:00"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Real-time Calculation Result Box */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">Minutos Trabajados</div>
                <div className="text-lg font-bold font-mono text-white">
                  {selectedCell.es_descanso ? '0 min (Descanso)' : selectedCell.calcWorked !== null ? `${selectedCell.calcWorked} min` : 'Incompleto'}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-400">Minutos Extras Resultantes</div>
                <div className={`text-xl font-bold font-mono ${
                  selectedCell.es_descanso
                    ? 'text-slate-400'
                    : selectedCell.calcExtra > 0
                    ? 'text-emerald-400'
                    : selectedCell.calcExtra < 0
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }`}>
                  {selectedCell.es_descanso ? '0' : selectedCell.calcExtra !== null ? (selectedCell.calcExtra > 0 ? `+${selectedCell.calcExtra} min` : `${selectedCell.calcExtra} min`) : '--'}
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={modalSaving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
              >
                <Check size={16} />
                <span>{modalSaving ? 'Guardando...' : 'Guardar y Recalcular'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
