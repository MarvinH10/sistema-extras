import React, { useState, useEffect } from 'react';
import { getTurnos, previewCalculo } from '../services/api';
import TimeInput from '../components/TimeInput';
import { Calculator, ArrowRight, CheckCircle, Clock, Zap, Info, Sparkles } from 'lucide-react';

export default function CalculadoraRapidaView() {
  const [turnos, setTurnos] = useState([]);
  const [selectedTurnoId, setSelectedTurnoId] = useState('');
  const [fecha, setFecha] = useState('2026-08-01');
  const [ingreso1, setIngreso1] = useState('12:55');
  const [salida1, setSalida1] = useState('17:00');
  const [ingreso2, setIngreso2] = useState('17:45');
  const [salida2, setSalida2] = useState('22:30');
  const [esDescanso, setEsDescanso] = useState(false);

  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTurnos().then(res => {
      setTurnos(res.data);
      if (res.data.length > 0) {
        setSelectedTurnoId(res.data[0].id);
      }
    });
  }, []);

  const runCalculation = async () => {
    if (!selectedTurnoId) return;
    setLoading(true);
    try {
      const res = await previewCalculo({
        turno_id: selectedTurnoId,
        fecha,
        ingreso_1: ingreso1,
        salida_1: salida1,
        ingreso_2: ingreso2,
        salida_2: salida2,
        es_descanso: esDescanso,
      });
      setResultado(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCalculation();
  }, [selectedTurnoId, fecha, ingreso1, salida1, ingreso2, salida2, esDescanso]);

  const selectedTurno = turnos.find(t => t.id === Number(selectedTurnoId));

  const setPreset = (preset) => {
    if (preset === 'tarde_temprano') {
      const t = turnos.find(x => x.nombre === 'TARDE');
      if (t) setSelectedTurnoId(t.id);
      setIngreso1('12:45'); setSalida1('17:00'); setIngreso2('17:45'); setSalida2('22:30'); setEsDescanso(false);
    } else if (preset === 'tarde_tardanza') {
      const t = turnos.find(x => x.nombre === 'TARDE');
      if (t) setSelectedTurnoId(t.id);
      setIngreso1('13:08'); setSalida1('17:00'); setIngreso2('18:15'); setSalida2('22:00'); setEsDescanso(false);
    } else if (preset === 'compartido_5h') {
      const t = turnos.find(x => x.nombre === 'COMPARTIDO');
      if (t) setSelectedTurnoId(t.id);
      setIngreso1('08:50'); setSalida1('13:30'); setIngreso2('18:20'); setSalida2('22:30'); setEsDescanso(false);
    } else if (preset === 'todo_el_dia') {
      const t = turnos.find(x => x.nombre === 'TODO_EL_DIA');
      if (t) setSelectedTurnoId(t.id);
      setIngreso1('09:00'); setSalida1('14:00'); setIngreso2('15:00'); setSalida2('22:45'); setEsDescanso(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-card rounded-2xl p-5 shadow-xl flex items-center gap-3">
        <span className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
          <Calculator size={24} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-white">Simulador en Vivo de Horas Extras</h2>
          <p className="text-xs text-slate-400">
            Prueba cualquier horario y valida paso a paso cómo se aplican las reglas de tolerancia
          </p>
        </div>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-semibold text-slate-400 py-1.5 flex items-center gap-1">
          <Sparkles size={14} /> Casos de Prueba Rápidos:
        </span>
        <button
          onClick={() => setPreset('tarde_temprano')}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
        >
          Tarde: Llega antes (12:45) + Break acortado + Extras (+30m)
        </button>
        <button
          onClick={() => setPreset('tarde_tardanza')}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
        >
          Tarde: Tardanza (13:08) + Exceso break (-23m)
        </button>
        <button
          onClick={() => setPreset('compartido_5h')}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
        >
          Compartido: Break 5h + Extras (+30m)
        </button>
        <button
          onClick={() => setPreset('todo_el_dia')}
          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs rounded-lg border border-slate-700 transition"
        >
          Todo el Día: 09:00 a 22:45 (+285m)
        </button>
      </div>

      {/* Inputs Form */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Seleccionar Turno a Simular
            </label>
            <select
              value={selectedTurnoId}
              onChange={(e) => setSelectedTurnoId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 cursor-pointer"
            >
              {turnos.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nombre} (Entrada: {t.entrada_base?.substring(0, 5)} / Salida: {t.salida_base?.substring(0, 5)})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <div className="flex items-center gap-2 p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 w-full">
              <input
                type="checkbox"
                id="simDescanso"
                checked={esDescanso}
                onChange={(e) => setEsDescanso(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
              />
              <label htmlFor="simDescanso" className="text-xs font-medium text-slate-300 cursor-pointer">
                Simular Día de Descanso
              </label>
            </div>
          </div>
        </div>

        {!esDescanso && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                1. Ingreso Real
              </label>
              <TimeInput value={ingreso1} onChange={setIngreso1} className="w-full" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                2. Salida Break
              </label>
              <TimeInput value={salida1} onChange={setSalida1} className="w-full" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                3. Retorno Break
              </label>
              <TimeInput value={ingreso2} onChange={setIngreso2} className="w-full" />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                4. Salida Final
              </label>
              <TimeInput value={salida2} onChange={setSalida2} className="w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Calculation Results Card */}
      {resultado && (
        <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-semibold text-slate-400">Resultado del Cálculo</span>
              <h3 className="text-lg font-bold text-white">Desglose Detallado</h3>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-slate-400 block">Minutos Extras (vs 480m)</span>
              <span className={`text-2xl font-mono font-black ${
                resultado.minutos_extra > 0
                  ? 'text-emerald-400'
                  : resultado.minutos_extra < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}>
                {resultado.minutos_extra !== null
                  ? (resultado.minutos_extra > 0 ? `+${resultado.minutos_extra} min` : `${resultado.minutos_extra} min`)
                  : '--'}
              </span>
            </div>
          </div>

          {resultado.detalles && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-400" />
                  Sesión 1 (Ingreso hasta Break)
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Ingreso Computado:</span>
                  <span className="font-mono text-white">{resultado.detalles.ingreso_efectivo}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Salida a Break:</span>
                  <span className="font-mono text-white">{resultado.detalles.salida_break}</span>
                </div>
                <div className="flex justify-between text-indigo-300 font-semibold pt-1 border-t border-slate-800">
                  <span>Minutos Sesión 1:</span>
                  <span className="font-mono">{resultado.detalles.minutos_sesion_1} min</span>
                </div>
              </div>

              <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Clock size={14} className="text-purple-400" />
                  Sesión 2 (Retorno Break hasta Salida)
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Retorno Computado:</span>
                  <span className="font-mono text-white">{resultado.detalles.regreso_efectivo}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Salida Final:</span>
                  <span className="font-mono text-white">{resultado.detalles.salida_efectiva}</span>
                </div>
                <div className="flex justify-between text-purple-300 font-semibold pt-1 border-t border-slate-800">
                  <span>Minutos Sesión 2:</span>
                  <span className="font-mono">{resultado.detalles.minutos_sesion_2} min</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 block">Total Minutos Trabajados:</span>
              <span className="text-base font-bold font-mono text-white">
                {resultado.minutos_trabajados !== null ? `${resultado.minutos_trabajados} min` : 'Incompleto'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Jornada Legal Base:</span>
              <span className="text-base font-bold font-mono text-slate-300">480 min (8 horas)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
