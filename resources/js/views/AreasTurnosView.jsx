import React, { useState, useEffect } from 'react';
import { getAreas, getTurnos } from '../services/api';
import { Layers, Clock, ShieldCheck, AlertTriangle, Coffee, ArrowRight, CheckCircle2, Zap } from 'lucide-react';

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
          Lógica de Cálculo por Tipo de Turno
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <span><strong>Ingreso:</strong> Si llega &le; 13:00 computa <strong>13:00</strong>. Si llega después (ej. 13:05), computa <strong>13:05</strong> (tardanza).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Break Fijo (1 Hora):</strong> 60 minutos obligatorios desde Salida 1. Si vuelve antes, se exige 1 hora completa. Si vuelve después, se descuenta demora.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Salida:</strong> Base 22:00. Minutos después de las 22:00 son <strong>horas extras</strong>.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Jornada: <strong>8 Horas (480m)</strong>
              <div className="font-mono text-blue-300 mt-0.5">Sesión1 + Sesión2 - 480m</div>
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
                  <span><strong>Mañana (09:00 a 13:00):</strong> Entrada base 09:00. Salida break con corte base a las 13:00 (240 min).</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Retorno Break (Base 18:00):</strong> Si vuelve &le; 18:00 cuenta desde 18:00. Si vuelve después (ej. 18:01), se descuenta tardanza.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Salida:</strong> Base 22:00. Minutos extras menos minutos de demora = extras finales.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Jornada: <strong>8 Horas (480m)</strong>
              <div className="font-mono text-purple-300 mt-0.5">Sesión1 + Sesión2 - 480m</div>
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
                  <span><strong>Ingreso:</strong> Si llega &le; 09:00 computa <strong>09:00</strong>. Si llega después, se computa hora real.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Coffee size={14} className="text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Break Fijo (1 Hora):</strong> 60 minutos obligatorios desde Salida 1.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Salida:</strong> Todo el tiempo trabajado por encima de 8h (480m) suma horas extras directas.</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Jornada: <strong>8 Horas (480m)</strong>
              <div className="font-mono text-amber-300 mt-0.5">Sesión1 + Sesión2 - 480m</div>
            </div>
          </div>

          {/* PART TIME Card */}
          <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  PART TIME
                </span>
                <span className="text-xs font-mono text-slate-400">4 Horas Corrida</span>
              </div>
              
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Jornada:</strong> 4 horas corridas (240 minutos base). Sin refrigerio intermedio.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap size={14} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span><strong>Auto-detección:</strong> Aplica a colaboradores Part-Time o jornadas corridas de hasta 5h 30m.</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Extras / Déficit:</strong> Si trabaja más de 240m suma extras (+); si trabaja menos, genera déficit (-).</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
              Jornada: <strong>4 Horas (240m)</strong>
              <div className="font-mono text-cyan-300 mt-0.5">Trabajado - 240m</div>
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
