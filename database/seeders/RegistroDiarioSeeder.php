<?php

namespace Database\Seeders;

use App\Models\Empleado;
use App\Models\RegistroDiario;
use App\Services\CalculoHorasExtraService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class RegistroDiarioSeeder extends Seeder
{
    public function run(): void
    {
        $service = new CalculoHorasExtraService();
        $empleados = Empleado::all();
        $anio = 2026;
        $mes = 8;
        $diasEnMes = 31;

        foreach ($empleados as $emp) {
            for ($dia = 1; $dia <= 15; $dia++) {
                $fecha = sprintf('%04d-%02d-%02d', $anio, $mes, $dia);
                $carbonFecha = Carbon::parse($fecha);

                // Domingo es descanso
                if ($carbonFecha->isSunday()) {
                    RegistroDiario::create([
                        'empleado_id' => $emp->id,
                        'fecha' => $fecha,
                        'es_descanso' => true,
                        'minutos_trabajados' => 0,
                        'minutos_extra' => 0,
                        'incompleto' => false,
                        'turno_detectado' => 'TARDE',
                    ]);
                    continue;
                }

                // Generar marcajes según rotación realista
                $randomCase = ($emp->id + $dia) % 4;

                if ($randomCase === 0) {
                    // Turno TARDE con extras (+30 min)
                    $i1 = '12:45'; $s1 = '17:00'; $i2 = '17:45'; $s2 = '22:30';
                } elseif ($randomCase === 1) {
                    // Turno TARDE con tardanza y déficit (-20 min)
                    $i1 = '13:05'; $s1 = '17:00'; $i2 = '18:15'; $s2 = '22:00';
                } elseif ($randomCase === 2) {
                    // Turno COMPARTIDO exacto (0 min)
                    $i1 = '08:50'; $s1 = '13:30'; $i2 = '18:30'; $s2 = '22:00';
                } else {
                    // Turno TODO EL DIA con extras (+45 min)
                    $i1 = '09:00'; $s1 = '14:00'; $i2 = '15:00'; $s2 = '22:45';
                }

                $calculo = $service->calcular(
                    null, // Auto-detección automática de turno por horarios
                    $fecha,
                    $i1,
                    $s1,
                    $i2,
                    $s2,
                    false
                );

                RegistroDiario::create([
                    'empleado_id' => $emp->id,
                    'fecha' => $fecha,
                    'ingreso_1' => $i1,
                    'salida_1' => $s1,
                    'ingreso_2' => $i2,
                    'salida_2' => $s2,
                    'minutos_trabajados' => $calculo['minutos_trabajados'],
                    'minutos_extra' => $calculo['minutos_extra'],
                    'incompleto' => $calculo['incompleto'],
                    'es_descanso' => false,
                    'turno_detectado' => $calculo['turno_detectado'] ?? null,
                    'turno_id' => $calculo['turno_id'] ?? null,
                ]);
            }
        }
    }
}
