<?php

namespace App\Services;

use App\Models\Turno;
use Carbon\Carbon;

class CalculoHorasExtraService
{
    public const JORNADA_MINUTOS = 480; // 8 horas = 480 minutos
    public const JORNADA_PART_TIME_MINUTOS = 240; // 4 horas = 240 minutos

    /**
     * Detecta automáticamente el tipo de turno basado en los horarios de marcaje.
     *
     * @param Carbon|string|null $i1
     * @param Carbon|string|null $s1
     * @param Carbon|string|null $i2
     * @param Carbon|string|null $s2
     * @return string 'TARDE' | 'COMPARTIDO' | 'TODO_EL_DIA' | 'PART_TIME' | 'SIN_RESTRICCIONES'
     */
    public function detectarTipoTurno($i1, $s1, $i2, $s2): string
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

            // Si es jornada corta (hasta 5h30 / 330 min, ej. ~4 horas) => PART_TIME (4 horas)
            if ($duracion <= 330) {
                return 'PART_TIME';
            }

            // Si es jornada corrida larga (más de 5h30, ej. ~8 horas sin refrigerio) => SIN_RESTRICCIONES (8 horas)
            return 'SIN_RESTRICCIONES';
        }

        // Si ingresa al mediodía / tarde (11:45 en adelante, ej. 12:40, 12:55, 13:00, 16:10) => TARDE
        if ($totalMinutosIngreso >= (11 * 60 + 45)) {
            return 'TARDE';
        }

        // Si ingresa en la mañana (ej. 08:45, 09:00, 09:15)
        // Analizamos la duración del descanso (break) para distinguir COMPARTIDO (5h) de TODO_EL_DIA (1h)
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

            // Si el break es >= 3 horas (180 min, típicamente 5 horas / 300 min) => COMPARTIDO
            if ($duracionBreak >= 180) {
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
            $tipoDetectado = $this->detectarTipoTurno($ingreso1, $salida1, $ingreso2, $salida2);
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
            $tipoNombre = $this->detectarTipoTurno($dIngreso1, $dSalida1, $dIngreso2, $dSalida2);
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

        // Si no se proporcionó un Turno con horas base, instanciar un modelo con los valores estándar
        if (!$turno) {
            $turno = new Turno([
                'nombre' => $tipoNombre,
                'entrada_base' => $tipoNombre === 'TARDE' ? '13:00' : '09:00',
                'salida_base' => '22:00',
                'break_tipo' => $tipoNombre === 'COMPARTIDO' ? 'ventana' : 'fijo',
                'break_minutos' => $tipoNombre === 'COMPARTIDO' ? 300 : 60,
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
        $entradaBase = Carbon::parse("$fecha {$turno->entrada_base}");
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
     * Lógica para Turno COMPARTIDO (09:00 a 13:00 y 18:00 a 22:00).
     * - Mañana: Base 09:00 a 13:00 (tope 13:00 para descanso, 240 min).
     * - Tarde: Base 18:00 a 22:00. Si regresa > 18:00 (ej. 18:01), se descuenta tardanza.
     *   Las horas extras se computan a partir de las 22:00 (ej. salida 22:05 = +5m - 1m demora = +4 min).
     */
    private function calcularTurnoCompartido(
        Turno $turno,
        string $fecha,
        Carbon $i1,
        Carbon $s1,
        Carbon $i2,
        Carbon $s2
    ): array {
        $entradaBaseMañana = Carbon::parse("$fecha {$turno->entrada_base}"); // 09:00
        $salidaBaseMañana = Carbon::parse("$fecha 13:00");                   // 13:00
        $retornoBaseTarde = Carbon::parse("$fecha 18:00");                   // 18:00

        // 1. Sesión Mañana:
        // Ingreso efectivo (si llega <= 09:00 => 09:00, si llega > 09:00 => real)
        $ingresoEfectivo = $i1->lte($entradaBaseMañana) ? $entradaBaseMañana->copy() : $i1->copy();
        // Salida efectiva mañana (tope a las 13:00 para corte de refrigerio; si sale antes => real)
        $salidaEfectiva1 = $s1->gte($salidaBaseMañana) ? $salidaBaseMañana->copy() : $s1->copy();
        $sesion1 = max(0, (int) $ingresoEfectivo->diffInMinutes($salidaEfectiva1, false));

        // 2. Sesión Tarde:
        // Retorno efectivo (si regresa <= 18:00 => 18:00, si regresa > 18:00 ej. 18:01 => real con descuento)
        $regresoEfectivo = $i2->lte($retornoBaseTarde) ? $retornoBaseTarde->copy() : $i2->copy();
        $salidaEfectiva2 = $s2->copy();
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
                'ingreso_efectivo' => $ingresoEfectivo->format('H:i'),
                'salida_break' => $s1->format('H:i'),
                'salida_efectiva_manana' => $salidaEfectiva1->format('H:i'),
                'regreso_base' => '18:00',
                'regreso_efectivo' => $regresoEfectivo->format('H:i'),
                'salida_efectiva' => $salidaEfectiva2->format('H:i'),
                'minutos_sesion_1' => $sesion1,
                'minutos_sesion_2' => $sesion2,
            ],
        ];
    }
}
