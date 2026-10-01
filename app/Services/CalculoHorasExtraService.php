<?php

namespace App\Services;

use App\Models\Turno;
use Carbon\Carbon;

class CalculoHorasExtraService
{
    public const JORNADA_MINUTOS = 480; // 8 horas = 480 minutos
    public const JORNADA_PART_TIME_MINUTOS = 240; // 4 horas = 240 minutos

    /**
     * El cambio de horario de ingreso (09:00 -> 10:00) entra en vigor el 1 de octubre de 2026.
     * Los registros con fecha anterior se siguen calculando con las reglas anteriores.
     */
    public const CAMBIO_HORARIO_DESDE = '2026-10-01';

    // Horario vigente desde el 2026-10-01
    public const ENTRADA_BASE_MANANA = '10:00';
    public const SALIDA_BASE_MANANA = '13:00';
    public const RETORNO_BASE_TARDE = '16:30';
    public const SALIDA_BASE_TARDE = '21:30';
    public const BREAK_MIN_COMPARTIDO = 120;
    public const BREAK_WINDOW_COMPARTIDO = 210;

    // Horario anterior (hasta el 2026-09-30)
    public const LEG_ENTRADA_BASE_MANANA = '09:00';
    public const LEG_SALIDA_BASE_MANANA = '13:00';
    public const LEG_RETORNO_BASE_TARDE = '18:00';
    public const LEG_SALIDA_BASE_TARDE = '22:00';
    public const LEG_BREAK_MIN_COMPARTIDO = 180;
    public const LEG_BREAK_WINDOW_COMPARTIDO = 300;

    public const TARDE_ENTRADA_BASE = '13:00';

    /**
     * Indica si la fecha ya usa el horario vigente (ingreso 10:00).
     */
    public function esFechaHorarioNuevo(string $fecha): bool
    {
        return Carbon::parse($fecha)->startOfDay()->gte(Carbon::parse(self::CAMBIO_HORARIO_DESDE));
    }

    /**
     * Normaliza una hora a HH:MM.
     *
     * Las columnas TIME de MySQL/MariaDB se devuelven como "10:00:00", mientras
     * que en SQLite el valor queda como "10:00". Sin normalizar, la comparación
     * con las constantes de este servicio fallaba en producción y el cambio de
     * horario del 2026-10-01 no se aplicaba a las fechas anteriores.
     */
    private function normalizarHora(?string $hora): string
    {
        $hora = trim((string) $hora);

        if ($hora === '') {
            return '';
        }

        return strlen($hora) >= 5 ? substr($hora, 0, 5) : $hora;
    }

    /**
     * Resuelve la hora de entrada base de un turno según la fecha del registro.
     * Antes del cambio, los turnos de mañana ingressaban 09:00.
     */
    private function entradaBaseEfectiva(Turno $turno, string $fecha): string
    {
        if (
            !$this->esFechaHorarioNuevo($fecha)
            && $this->normalizarHora($turno->entrada_base) === self::ENTRADA_BASE_MANANA
        ) {
            return self::LEG_ENTRADA_BASE_MANANA;
        }

        return $turno->entrada_base;
    }

    /**
     * Detecta automáticamente el tipo de turno basado en los horarios de marcaje.
     *
     * @param Carbon|string|null $i1
     * @param Carbon|string|null $s1
     * @param Carbon|string|null $i2
     * @param Carbon|string|null $s2
     * @param string|null $fecha Fecha del registro; define el umbral de break (anterior o vigente)
     * @return string 'TARDE' | 'COMPARTIDO' | 'TODO_EL_DIA' | 'PART_TIME' | 'SIN_RESTRICCIONES'
     */
    public function detectarTipoTurno($i1, $s1, $i2, $s2, ?string $fecha = null): string
    {
        if (empty($i1)) {
            return 'TARDE';
        }

        $ingreso1Str = is_string($i1) ? $i1 : $i1->format('H:i');
        $parts = explode(':', $ingreso1Str);
        $horaIngreso = (int) $parts[0];
        $minIngreso = isset($parts[1]) ? (int) $parts[1] : 0;
        $totalMinutosIngreso = $horaIngreso * 60 + $minIngreso;

        // Si solo hay 2 marcajes (jornada corrida sin descanso intermedio)
        $salidaCorrida = !empty($s2) ? $s2 : $s1;
        $soloEntradaSalida = (!empty($i1) && !empty($s2) && empty($s1) && empty($i2)) ||
                             (!empty($i1) && !empty($s1) && empty($i2) && empty($s2));

        if ($soloEntradaSalida && !empty($salidaCorrida)) {
            $salidaStr = is_string($salidaCorrida) ? $salidaCorrida : $salidaCorrida->format('H:i');
            [$sH, $sM] = explode(':', $salidaStr);
            $totalMinutosSalida = (int) $sH * 60 + (int) $sM;
            if ($totalMinutosSalida < $totalMinutosIngreso) {
                $totalMinutosSalida += 24 * 60;
            }
            $duracion = $totalMinutosSalida - $totalMinutosIngreso;

            // Si es jornada corta (hasta 5h30 / 330 min, ej. ~4 horas) => PART_TIME
            if ($duracion <= 330) {
                return 'PART_TIME';
            }
        }

        // Si ingresa al mediodía / tarde (11:45 en adelante, ej. 12:40, 12:55, 13:00, 16:10) => TARDE
        if ($totalMinutosIngreso >= (11 * 60 + 45)) {
            return 'TARDE';
        }

        // Si ingresa en la mañana (ej. 09:50, 10:00, 10:15)
        // Analizamos la duración del descanso (break) para distinguir COMPARTIDO (210 min) de TODO_EL_DIA (60 min)
        if (!empty($s1) && !empty($i2)) {
            $s1Str = is_string($s1) ? $s1 : $s1->format('H:i');
            $i2Str = is_string($i2) ? $i2 : $i2->format('H:i');

            [$s1H, $s1M] = explode(':', $s1Str);
            [$i2H, $i2M] = explode(':', $i2Str);

            $s1Total = (int) $s1H * 60 + (int) $s1M;
            $i2Total = (int) $i2H * 60 + (int) $i2M;

            if ($i2Total < $s1Total) {
                $i2Total += 24 * 60; // Cruce medianoche
            }

            $duracionBreak = $i2Total - $s1Total;

            // Umbral de break según el horario aplicable a la fecha del registro
            $breakMinCompartido = ($fecha !== null && !$this->esFechaHorarioNuevo($fecha))
                ? self::LEG_BREAK_MIN_COMPARTIDO
                : self::BREAK_MIN_COMPARTIDO;

            // Break largo (>= 120 min en el horario vigente / >= 180 min en el anterior) => COMPARTIDO
            if ($duracionBreak >= $breakMinCompartido) {
                return 'COMPARTIDO';
            }

            // Si el break es corto (~1 hora / 60 min) => TODO_EL_DIA
            return 'TODO_EL_DIA';
        }

        // Por defecto en la mañana si no hay break registrado aún
        return 'COMPARTIDO';
    }

    /**
     * Calcula los minutos trabajados y minutos extras (o déficit) de acuerdo a las reglas de negocio.
     */
    public function calcular(
        ?Turno $turno,
        string $fecha,
        ?string $ingreso1,
        ?string $salida1,
        ?string $ingreso2,
        ?string $salida2,
        bool $esDescanso = false,
        bool $sinRestricciones = false
    ): array {
        if ($esDescanso) {
            return [
                'minutos_trabajados' => 0,
                'minutos_extra' => 0,
                'incompleto' => false,
                'es_descanso' => true,
                'sin_restricciones' => false,
                'turno_detectado' => $turno?->nombre ?? 'TARDE',
                'detalles' => [
                    'mensaje' => 'Día de descanso',
                ],
            ];
        }

        // Si no hay ningún marcaje
        $ninguno = empty($ingreso1) && empty($salida1) && empty($ingreso2) && empty($salida2);
        if ($ninguno) {
            return [
                'minutos_trabajados' => null,
                'minutos_extra' => null,
                'incompleto' => false,
                'es_descanso' => false,
                'sin_restricciones' => $sinRestricciones,
                'turno_detectado' => $turno?->nombre ?? null,
                'detalles' => [
                    'mensaje' => 'Sin marcajes',
                ],
            ];
        }

        $tipoNombre = $turno ? strtoupper(trim($turno->nombre)) : null;

        // Jornada corrida (solo 2 marcajes: entrada y salida sin break intermedio)
        $salidaPartTime = !empty($salida2) ? $salida2 : $salida1;
        $soloEntradaSalida = (!empty($ingreso1) && !empty($salida2) && empty($salida1) && empty($ingreso2)) ||
                             (!empty($ingreso1) && !empty($salida1) && empty($ingreso2) && empty($salida2));

        if ($soloEntradaSalida && !empty($ingreso1) && !empty($salidaPartTime)) {
            $dIngreso = Carbon::parse("$fecha $ingreso1");
            $dSalida = Carbon::parse("$fecha $salidaPartTime");
            if ($dSalida->lt($dIngreso)) {
                $dSalida->addDay();
            }

            $minutosTrabajados = max(0, (int) $dIngreso->diffInMinutes($dSalida, false));

            // Si se especificó explícitamente PART_TIME o se detecta automáticamente por duración <= 5h30 (330 min)
            $esPartTime = ($tipoNombre === 'PART_TIME') || ($tipoNombre === null && $minutosTrabajados <= 330);

            if ($esPartTime) {
                $minutosExtra = $minutosTrabajados - self::JORNADA_PART_TIME_MINUTOS; // Base 240 min (4h)

                return [
                    'minutos_trabajados' => $minutosTrabajados,
                    'minutos_extra' => $minutosExtra,
                    'incompleto' => false,
                    'es_descanso' => false,
                    'sin_restricciones' => false,
                    'turno_detectado' => 'PART_TIME',
                    'turno_id' => $turno?->id ?? null,
                    'detalles' => [
                        'tipo_turno' => 'PART_TIME',
                        'modo' => 'Jornada corrida Part Time (4 horas / 240 min)',
                        'ingreso' => $dIngreso->format('H:i'),
                        'salida' => $dSalida->format('H:i'),
                        'minutos_trabajados' => $minutosTrabajados,
                    ],
                ];
            } else {
                // Jornada corrida larga de ~8 horas sin descanso => SIN_RESTRICCIONES (Base 480 min / 8h)
                $minutosExtra = $minutosTrabajados - self::JORNADA_MINUTOS;
                $tipoDetectado = $tipoNombre ?: 'SIN_RESTRICCIONES';

                return [
                    'minutos_trabajados' => $minutosTrabajados,
                    'minutos_extra' => $minutosExtra,
                    'incompleto' => false,
                    'es_descanso' => false,
                    'sin_restricciones' => true,
                    'turno_detectado' => $tipoDetectado,
                    'turno_id' => $turno?->id ?? null,
                    'detalles' => [
                        'tipo_turno' => $tipoDetectado,
                        'modo' => 'Jornada corrida sin descanso (Base 8 horas / 480 min)',
                        'ingreso' => $dIngreso->format('H:i'),
                        'salida' => $dSalida->format('H:i'),
                        'minutos_trabajados' => $minutosTrabajados,
                    ],
                ];
            }
        }

        // Si faltan algunos marcajes en turnos estándar de 4 marcas
        if (empty($ingreso1) || empty($salida1) || empty($ingreso2) || empty($salida2)) {
            $tipoDetectado = $this->detectarTipoTurno($ingreso1, $salida1, $ingreso2, $salida2, $fecha);
            return [
                'minutos_trabajados' => null,
                'minutos_extra' => null,
                'incompleto' => true,
                'es_descanso' => false,
                'sin_restricciones' => $sinRestricciones,
                'turno_detectado' => $tipoNombre ?? $tipoDetectado,
                'detalles' => [
                    'mensaje' => 'Marcajes incompletos',
                ],
            ];
        }

        // Parsear fechas y horas para turnos de 4 marcas
        $dIngreso1 = Carbon::parse("$fecha $ingreso1");
        $dSalida1 = Carbon::parse("$fecha $salida1");
        if ($dSalida1->lt($dIngreso1)) {
            $dSalida1->addDay();
        }

        $dIngreso2 = Carbon::parse("$fecha $ingreso2");
        if ($dIngreso2->lt($dSalida1)) {
            $dIngreso2->addDay();
        }

        $dSalida2 = Carbon::parse("$fecha $salida2");
        if ($dSalida2->lt($dIngreso2)) {
            $dSalida2->addDay();
        }

        if (!$tipoNombre) {
            $tipoNombre = $this->detectarTipoTurno($dIngreso1, $dSalida1, $dIngreso2, $dSalida2, $fecha);
        }

        // MODO SIN RESTRICCIONES (Hora real exacta punto a punto)
        if ($sinRestricciones || $tipoNombre === 'SIN_RESTRICCIONES') {
            $sesion1 = (int) $dIngreso1->diffInMinutes($dSalida1, false);
            $sesion2 = (int) $dIngreso2->diffInMinutes($dSalida2, false);

            $minutosTrabajados = max(0, $sesion1 + $sesion2);
            $minutosExtra = $minutosTrabajados - self::JORNADA_MINUTOS;

            return [
                'minutos_trabajados' => $minutosTrabajados,
                'minutos_extra' => $minutosExtra,
                'incompleto' => false,
                'es_descanso' => false,
                'sin_restricciones' => true,
                'turno_detectado' => 'SIN_RESTRICCIONES',
                'turno_id' => $turno?->id ?? null,
                'detalles' => [
                    'tipo_turno' => 'SIN_RESTRICCIONES',
                    'modo' => 'Horas reales exactas sin topes',
                    'ingreso_1' => $dIngreso1->format('H:i'),
                    'salida_1' => $dSalida1->format('H:i'),
                    'ingreso_2' => $dIngreso2->format('H:i'),
                    'salida_2' => $dSalida2->format('H:i'),
                    'minutos_sesion_1' => $sesion1,
                    'minutos_sesion_2' => $sesion2,
                ],
            ];
        }

        // Si no se proporcionó un Turno con horas base, instanciar un modelo con los valores del horario aplicable a la fecha
        if (!$turno) {
            $esNuevo = $this->esFechaHorarioNuevo($fecha);
            $turno = new Turno([
                'nombre' => $tipoNombre,
                'entrada_base' => $tipoNombre === 'TARDE'
                    ? self::TARDE_ENTRADA_BASE
                    : ($esNuevo ? self::ENTRADA_BASE_MANANA : self::LEG_ENTRADA_BASE_MANANA),
                'salida_base' => '22:00',
                'break_tipo' => $tipoNombre === 'COMPARTIDO' ? 'ventana' : 'fijo',
                'break_minutos' => $tipoNombre === 'COMPARTIDO'
                    ? ($esNuevo ? self::BREAK_WINDOW_COMPARTIDO : self::LEG_BREAK_WINDOW_COMPARTIDO)
                    : 60,
            ]);
        }

        $resultado = match ($tipoNombre) {
            'TARDE', 'TODO_EL_DIA', 'TODO EL DIA', 'TODO EL DÍA' => $this->calcularTurnoFijo(
                $turno,
                $fecha,
                $dIngreso1,
                $dSalida1,
                $dIngreso2,
                $dSalida2
            ),
            'COMPARTIDO' => $this->calcularTurnoCompartido(
                $turno,
                $fecha,
                $dIngreso1,
                $dSalida1,
                $dIngreso2,
                $dSalida2
            ),
            default => $this->calcularTurnoFijo(
                $turno,
                $fecha,
                $dIngreso1,
                $dSalida1,
                $dIngreso2,
                $dSalida2
            ),
        };

        $resultado['turno_detectado'] = $tipoNombre;
        $resultado['turno_id'] = $turno->id ?? null;
        $resultado['sin_restricciones'] = false;

        return $resultado;
    }

    /**
     * Lógica para Turnos con Entrada Base fija y Break Fijo (TARDE y TODO_EL_DIA).
     */
    private function calcularTurnoFijo(
        Turno $turno,
        string $fecha,
        Carbon $i1,
        Carbon $s1,
        Carbon $i2,
        Carbon $s2
    ): array {
        $entradaBase = Carbon::parse("$fecha " . $this->entradaBaseEfectiva($turno, $fecha));
        $breakMinutos = $turno->break_minutos ?: 60;

        // 1. Ingreso efectivo: si llega <= base => base. Si llega > base => real.
        $ingresoEfectivo = $i1->lte($entradaBase) ? $entradaBase->copy() : $i1->copy();

        // 2. Regreso de break efectivo: si regresa antes de s1 + break => s1 + break. Si regresa > => real.
        $regresoMinimo = $s1->copy()->addMinutes($breakMinutos);
        $regresoEfectivo = $i2->lt($regresoMinimo) ? $regresoMinimo->copy() : $i2->copy();

        // 3. Salida efectiva: real
        $salidaEfectiva = $s2->copy();

        // Cálculo de sesiones
        $sesion1 = (int) $ingresoEfectivo->diffInMinutes($s1, false);
        $sesion2 = (int) $regresoEfectivo->diffInMinutes($salidaEfectiva, false);

        $minutosTrabajados = max(0, $sesion1 + $sesion2);
        $minutosExtra = $minutosTrabajados - self::JORNADA_MINUTOS;

        return [
            'minutos_trabajados' => $minutosTrabajados,
            'minutos_extra' => $minutosExtra,
            'incompleto' => false,
            'es_descanso' => false,
            'detalles' => [
                'tipo_turno' => $turno->nombre,
                'horario' => $this->esFechaHorarioNuevo($fecha) ? 'VIGENTE' : 'ANTERIOR',
                'entrada_base' => $entradaBase->format('H:i'),
                'ingreso_efectivo' => $ingresoEfectivo->format('H:i'),
                'salida_break' => $s1->format('H:i'),
                'regreso_minimo' => $regresoMinimo->format('H:i'),
                'regreso_efectivo' => $regresoEfectivo->format('H:i'),
                'salida_efectiva' => $salidaEfectiva->format('H:i'),
                'minutos_sesion_1' => $sesion1,
                'minutos_sesion_2' => $sesion2,
            ],
        ];
    }

    /**
     * Lógica para Turno COMPARTIDO.
     *
     * Desde el 2026-10-01: 10:00 a 13:00 y 16:30 a 21:30.
     * Hasta el 2026-09-30: 09:00 a 13:00 y 18:00 a 22:00 (la salida se tomaba real, sin tope).
     */
    private function calcularTurnoCompartido(
        Turno $turno,
        string $fecha,
        Carbon $i1,
        Carbon $s1,
        Carbon $i2,
        Carbon $s2
    ): array {
        $esNuevo = $this->esFechaHorarioNuevo($fecha);

        $entradaBaseMañana = Carbon::parse("$fecha " . $this->entradaBaseEfectiva($turno, $fecha));
        $salidaBaseMañana = Carbon::parse("$fecha " . ($esNuevo ? self::SALIDA_BASE_MANANA : self::LEG_SALIDA_BASE_MANANA));
        $retornoBaseTarde = Carbon::parse("$fecha " . ($esNuevo ? self::RETORNO_BASE_TARDE : self::LEG_RETORNO_BASE_TARDE));
        $salidaBaseTarde = Carbon::parse("$fecha " . ($esNuevo ? self::SALIDA_BASE_TARDE : self::LEG_SALIDA_BASE_TARDE));

        // 1. Sesión Mañana:
        // Ingreso efectivo (si llega <= base => base, si llega > base => real)
        $ingresoEfectivo = $i1->lte($entradaBaseMañana) ? $entradaBaseMañana->copy() : $i1->copy();
        // Salida efectiva mañana (tope para corte de refrigerio; si sale antes => real)
        $salidaEfectiva1 = $s1->gte($salidaBaseMañana) ? $salidaBaseMañana->copy() : $s1->copy();
        $sesion1 = max(0, (int) $ingresoEfectivo->diffInMinutes($salidaEfectiva1, false));

        // 2. Sesión Tarde:
        // Retorno efectivo (si regresa <= base => base, si regresa > base ej. 16:31 => real con descuento)
        $regresoEfectivo = $i2->lte($retornoBaseTarde) ? $retornoBaseTarde->copy() : $i2->copy();

        if ($esNuevo) {
            // Horario vigente: la salida se topa a la base 21:30; lo que pase de ahí son extras.
            $salidaEfectiva2 = $s2->lte($salidaBaseTarde) ? $salidaBaseTarde->copy() : $s2->copy();
        } else {
            // Horario anterior: la salida final era sempre la hora real registrada.
            $salidaEfectiva2 = $s2->copy();
        }
        $sesion2 = max(0, (int) $regresoEfectivo->diffInMinutes($salidaEfectiva2, false));

        $minutosTrabajados = $sesion1 + $sesion2;
        $minutosExtra = $minutosTrabajados - self::JORNADA_MINUTOS;

        return [
            'minutos_trabajados' => $minutosTrabajados,
            'minutos_extra' => $minutosExtra,
            'incompleto' => false,
            'es_descanso' => false,
            'detalles' => [
                'tipo_turno' => 'COMPARTIDO',
                'horario' => $esNuevo ? 'VIGENTE' : 'ANTERIOR',
                'ingreso_efectivo' => $ingresoEfectivo->format('H:i'),
                'salida_break' => $s1->format('H:i'),
                'salida_efectiva_manana' => $salidaEfectiva1->format('H:i'),
                'regreso_base' => $retornoBaseTarde->format('H:i'),
                'regreso_efectivo' => $regresoEfectivo->format('H:i'),
                'salida_base_tarde' => $salidaBaseTarde->format('H:i'),
                'salida_efectiva' => $salidaEfectiva2->format('H:i'),
                'minutos_sesion_1' => $sesion1,
                'minutos_sesion_2' => $sesion2,
            ],
        ];
    }
}
