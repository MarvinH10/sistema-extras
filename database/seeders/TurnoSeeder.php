<?php

namespace Database\Seeders;

use App\Models\Turno;
use Illuminate\Database\Seeder;

class TurnoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $turnos = [
            [
                'nombre' => 'TARDE',
                'codigo' => 'TRD',
                'entrada_base' => '13:00',
                'salida_base' => '22:00',
                'break_tipo' => 'fijo',
                'break_minutos' => 60,
                'descripcion' => 'Turno de tarde: 13:00 a 22:00, 1 hora de break obligatorio.',
            ],
            [
                'nombre' => 'COMPARTIDO',
                'codigo' => 'CMP',
                'entrada_base' => '10:00',
                'salida_base' => '21:30',
                'break_tipo' => 'ventana',
                'break_minutos' => 210,
                'descripcion' => 'Turno compartido: 10:00 a 13:00 y 16:30 a 21:30, break ventana de 210 min.',
            ],
            [
                'nombre' => 'TODO_EL_DIA',
                'codigo' => 'TED',
                'entrada_base' => '10:00',
                'salida_base' => '22:00',
                'break_tipo' => 'fijo',
                'break_minutos' => 60,
                'descripcion' => 'Turno todo el día: 10:00 a 22:00, break fijo de 1 hora en cualquier momento.',
            ],
            [
                'nombre' => 'PART_TIME',
                'codigo' => 'PT',
                'entrada_base' => '14:00',
                'salida_base' => '18:00',
                'break_tipo' => 'fijo',
                'break_minutos' => 0,
                'descripcion' => 'Turno Part Time: 4 horas (240 min) jornada corrida sin break.',
            ],
        ];

        foreach ($turnos as $t) {
            Turno::updateOrCreate(['nombre' => $t['nombre']], $t);
        }
    }
}
