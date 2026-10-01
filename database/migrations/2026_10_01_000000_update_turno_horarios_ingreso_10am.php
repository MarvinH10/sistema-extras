<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Nuevo horario de ingreso: 09:00 -> 10:00.
     *
     * COMPARTIDO: 10:00 a 13:00 (180 min) + 16:30 a 21:30 (300 min) = 480 min
     * TODO_EL_DIA: 10:00 a 22:00 con break fijo de 60 min
     */
    public function up(): void
    {
        DB::table('turnos')->where('nombre', 'COMPARTIDO')->update([
            'entrada_base' => '10:00',
            'salida_base' => '21:30',
            'break_minutos' => 210,
            'descripcion' => 'Turno compartido: 10:00 a 13:00 y 16:30 a 21:30, break ventana de 210 min.',
            'updated_at' => now(),
        ]);

        DB::table('turnos')->where('nombre', 'TODO_EL_DIA')->update([
            'entrada_base' => '10:00',
            'descripcion' => 'Turno todo el día: 10:00 a 22:00, break fijo de 1 hora en cualquier momento.',
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('turnos')->where('nombre', 'COMPARTIDO')->update([
            'entrada_base' => '09:00',
            'salida_base' => '22:00',
            'break_minutos' => 300,
            'descripcion' => 'Turno compartido: 09:00 a 22:00, break ventana con 5h obligatorias.',
            'updated_at' => now(),
        ]);

        DB::table('turnos')->where('nombre', 'TODO_EL_DIA')->update([
            'entrada_base' => '09:00',
            'descripcion' => 'Turno todo el día: 09:00 a 22:00, 1 hora de break obligatorio.',
            'updated_at' => now(),
        ]);
    }
};
