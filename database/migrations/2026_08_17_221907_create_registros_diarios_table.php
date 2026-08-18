<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('registros_diarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empleado_id')->constrained('empleados')->cascadeOnDelete();
            $table->foreignId('turno_id')->nullable()->constrained('turnos')->nullOnDelete();
            $table->string('turno_detectado')->nullable(); // TARDE, COMPARTIDO, TODO_EL_DIA, SIN_RESTRICCIONES
            $table->date('fecha');
            $table->time('ingreso_1')->nullable();
            $table->time('salida_1')->nullable(); // salida a break
            $table->time('ingreso_2')->nullable(); // regreso de break
            $table->time('salida_2')->nullable(); // salida final
            $table->integer('minutos_trabajados')->nullable();
            $table->integer('minutos_extra')->nullable(); // puede ser positivo o negativo
            $table->boolean('incompleto')->default(false);
            $table->boolean('es_descanso')->default(false);
            $table->boolean('sin_restricciones')->default(false); // calcula horas reales de punto a punto sin topes
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->unique(['empleado_id', 'fecha']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('registros_diarios');
    }
};
