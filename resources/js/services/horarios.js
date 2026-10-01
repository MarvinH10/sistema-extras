// Horarios de turnos y corte del cambio de ingreso 09:00 -> 10:00.
// Debe mantenerse sincronizado con app/Services/CalculoHorasExtraService.php

export const CAMBIO_HORARIO_DESDE = '2026-10-01';

// Horario vigente desde el 2026-10-01
export const HORARIO_VIGENTE = {
  ENTRADA_BASE_MANANA: 10 * 60, // 10:00
  SALIDA_BASE_MANANA: 13 * 60, // 13:00
  RETORNO_BASE_TARDE: 16 * 60 + 30, // 16:30
  SALIDA_BASE_TARDE: 21 * 60 + 30, // 21:30
  BREAK_MIN_COMPARTIDO: 120,
};

// Horario anterior (hasta el 2026-09-30)
export const HORARIO_ANTERIOR = {
  ENTRADA_BASE_MANANA: 9 * 60, // 09:00
  SALIDA_BASE_MANANA: 13 * 60, // 13:00
  RETORNO_BASE_TARDE: 18 * 60, // 18:00
  SALIDA_BASE_TARDE: 22 * 60, // 22:00
  BREAK_MIN_COMPARTIDO: 180,
  // En el horario anterior la salida final se tomaba real, sin tope a la base.
  TOPA_SALIDA_TARDE: false,
};

export const TARDE_ENTRADA_BASE = 13 * 60;

export function esHorarioNuevo(fecha) {
  if (!fecha) return true;
  return String(fecha).slice(0, 10) >= CAMBIO_HORARIO_DESDE;
}

export function horarioPara(fecha) {
  return esHorarioNuevo(fecha) ? HORARIO_VIGENTE : HORARIO_ANTERIOR;
}

export function minutosATexto(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Rango de un turno según la fecha, p.ej. "10:00-21:30".
 * PART_TIME y TARDE no cambian con el calendario.
 */
export function rangoTurno(nombre, fecha) {
  const h = horarioPara(fecha);
  switch (nombre) {
    case 'COMPARTIDO':
      return `${minutosATexto(h.ENTRADA_BASE_MANANA)}-${minutosATexto(h.SALIDA_BASE_TARDE)}`;
    case 'TODO_EL_DIA':
      return `${minutosATexto(h.ENTRADA_BASE_MANANA)}-22:00`;
    case 'TARDE':
      return '13:00-22:00';
    case 'PART_TIME':
      return '4 Horas';
    default:
      return '';
  }
}

/** Etiqueta lista para un <option>, p.ej. "COMPARTIDO (10:00-21:30)". */
export function etiquetaTurno(nombre, fecha) {
  const rango = rangoTurno(nombre, fecha);
  return rango ? `${nombre} (${rango})` : nombre;
}

/** Entrada y salida de un turno según la fecha, como pares ya formateados. */
export function entradaSalidaTurno(nombre, fecha) {
  const h = horarioPara(fecha);
  switch (nombre) {
    case 'COMPARTIDO':
      return { entrada: minutosATexto(h.ENTRADA_BASE_MANANA), salida: minutosATexto(h.SALIDA_BASE_TARDE) };
    case 'TODO_EL_DIA':
      return { entrada: minutosATexto(h.ENTRADA_BASE_MANANA), salida: '22:00' };
    case 'TARDE':
      return { entrada: '13:00', salida: '22:00' };
    case 'PART_TIME':
      return { entrada: '14:00', salida: '18:00' };
    default:
      return { entrada: '—', salida: '—' };
  }
}

/**
 * Marcajes sugeridos para los botones de atajo de cada turno,
 * coherentes con el horario aplicable a la fecha.
 */
export function marcajesPreset(nombre, fecha) {
  const h = horarioPara(fecha);
  const manana = minutosATexto(h.ENTRADA_BASE_MANANA);

  switch (nombre) {
    case 'COMPARTIDO':
      return {
        i1: manana,
        s1: '13:30',
        i2: minutosATexto(h.RETORNO_BASE_TARDE),
        s2: minutosATexto(h.SALIDA_BASE_TARDE),
      };
    case 'TODO_EL_DIA':
      return { i1: manana, s1: '14:00', i2: '15:00', s2: '22:00' };
    case 'PART_TIME':
      return { i1: '14:00', s1: '', i2: '', s2: '18:00' };
    case 'TARDE':
    default:
      return { i1: '13:00', s1: '17:00', i2: '18:00', s2: '22:00' };
  }
}

/**
 * Textos de las tarjetas de reglas de AreasTurnosView.
 * Devuelve null si el turno no depende del calendario.
 */
export function reglasTurno(nombre, fecha) {
  const h = horarioPara(fecha);
  const esNuevo = esHorarioNuevo(fecha);
  const entrada = minutosATexto(h.ENTRADA_BASE_MANANA);
  const mananaMin = h.SALIDA_BASE_MANANA - h.ENTRADA_BASE_MANANA;
  const tardeMin = h.TOPA_SALIDA_TARDE !== false
    ? h.SALIDA_BASE_TARDE - h.RETORNO_BASE_TARDE
    : null;

  if (nombre === 'COMPARTIDO') {
    return {
      rango: esNuevo ? `${entrada}-${minutosATexto(h.SALIDA_BASE_TARDE)}` : `${entrada}-22:00`,
      manana: `Mañana (${entrada} a 13:00): Entrada base ${entrada}. Salida break con corte base a las 13:00 (${mananaMin} min).`,
      break: esNuevo
        ? `Retorno Break (Base 16:30): Si vuelve ≤ 16:30 cuenta desde 16:30. Si vuelve después (ej. 16:31), se descuenta tardanza.`
        : `Retorno Break (Base 18:00): Si vuelve ≤ 18:00 cuenta desde 18:00. Si vuelve después (ej. 18:01), se descuenta tardanza.`,
      salida: esNuevo
        ? 'Salida: Base 21:30. Lo que pase de las 21:30 suma extras directos.'
        : 'Salida: La hora real de marcaje. Minutos extras menos minutos de demora = extras finales.',
      detalle: tardeMin !== null ? `Mañana ${mananaMin}m + Tarde ${tardeMin}m = 480m` : 'Mañana 240m + Tarde (hasta 22:00)',
    };
  }

  if (nombre === 'TODO_EL_DIA') {
    return {
      rango: `${entrada}-22:00`,
      ingreso: `Ingreso: Si llega ≤ ${entrada} computa ${entrada}. Si llega después, se computa hora real.`,
      break: 'Break Fijo (1 Hora): Puede salir a cualquier hora, pero debe cumplir 60 min.',
      salida: 'Salida: Todo el tiempo trabajado por encima de 8h (480m) suma horas extras directas.',
      detalle: 'Jornada corrida - 480m',
    };
  }

  return null;
}

/** Etiqueta corta del régimen aplicable a una fecha. */
export function etiquetaRegimen(fecha) {
  return esHorarioNuevo(fecha)
    ? `Horario vigente (desde ${CAMBIO_HORARIO_DESDE})`
    : `Horario anterior (hasta 2026-09-30)`;
}