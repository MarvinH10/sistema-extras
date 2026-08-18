import React, { useState, useEffect } from 'react';
import { getAreas, getTurnos } from '../services/api';
import { Layers, Clock, ShieldCheck, AlertTriangle, Coffee, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function AreasTurnosView() {
  const [areas, setAreas] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAreas(), getTurnos()])
      .then(([areaRes, turnoRes]) => {
        setAreas(areaRes.data);
        setTurnos(turnoRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400">
            <Layers size={24} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-white">Estructura de Áreas y Reglas de Turnos</h2>
            <p className="text-xs text-slate-400">
              Configuración de turnos de trabajo, políticas de tolerancia y cálculo de horas extras
            </p>
          </div>
        </div>
      </div>

      {/* Turnos Rules Cards */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="text-indigo-400" size={18} />
          Lógica de Cálculo por Tipo de Turno (Jornada Base = 8 Horas / 480 Minutos)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* TARDE Card */}
          <div className="glass-panel rounded-2xl p-5 border border-blue-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  TURNO TARDE
                </span>
                <span className="text-xs font-mono text-slate-400">13:00 - 22:00</span>
              </div>
              
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <span><strong>Ingreso:</strong> Si llega $\le$ 13:00 computa <strong>13:00</strong>. Si llega después (ej. 13:05), computa <strong>13:05</strong> (tardanza).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Break Fijo:</strong> 60 minutos obligatorios desde Salida 1. Si vuelve antes, se fuerza a 60 min. Si vuelve después, pierde esos minutos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Salida:</strong> Base 22:00. Minutos después de las 22:00 son <strong>horas extras</strong>.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Fórmula: <code className="text-blue-300 font-mono">Sesión1 + Sesión2 - 480m</code>
            </div>
          </div>

          {/* COMPARTIDO Card */}
          <div className="glass-panel rounded-2xl p-5 border border-purple-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  TURNO COMPARTIDO
                </span>
                <span className="text-xs font-mono text-slate-400">09:00 - 22:00</span>
              </div>
              
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0 mt-0.5" />
                  <span><strong>Ingreso:</strong> Si llega $\le$ 09:00 computa <strong>09:00</strong>. Si llega después, se computa hora real.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Break Ventana (5 Horas):</strong> Salida 13:00-14:00. Obligatorio 300 min (5h) de break. Si vuelve antes, se computa $S_1 + 5h$.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Salida:</strong> Base 22:00. Cualquier exceso suma minutos extras positivos.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Fórmula: <code className="text-purple-300 font-mono">Sesión1 + Sesión2 - 480m</code>
            </div>
          </div>

          {/* TODO EL DIA Card */}
          <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TODO EL DÍA
                </span>
                <span className="text-xs font-mono text-slate-400">09:00 - 22:00</span>
              </div>
              
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Ingreso:</strong> Si llega $\le$ 09:00 computa <strong>09:00</strong>. Si llega después, se computa hora real.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Break Fijo:</strong> 60 minutos obligatorios desde Salida 1.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Salida:</strong> Todo el tiempo trabajado por encima de 8h (480m) suma horas extras directas.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Fórmula: <code className="text-amber-300 font-mono">Sesión1 + Sesión2 - 480m</code>
            </div>
          </div>
        </div>
      </div>

      {/* Areas List Grid */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Layers className="text-indigo-400" size={18} />
          Áreas de Operación ({areas.length})
        </h3>

        {loading ? (
          <div className="glass-panel p-8 text-center text-slate-400">Cargando áreas...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {areas.map((area) => (
              <div
                key={area.id}
                className="glass-card rounded-xl p-3.5 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
              >
                <div>
                  <div className="font-semibold text-white text-xs sm:text-sm">{area.nombre}</div>
                  <div className="text-[11px] text-slate-500 font-mono">CÓDIGO: {area.codigo || '-'}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-mono font-semibold">
                  {area.empleados_count ?? 0} pers.
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
