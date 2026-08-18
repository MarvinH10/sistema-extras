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
        Schema::create('turnos', function (Blueprint $table) {
            $table->id();
            $table->string('nombre'); // TARDE, COMPARTIDO, TODO_EL_DIA
            $table->string('codigo')->nullable();
            $table->time('entrada_base'); // 13:00 / 09:00 / 09:00
            $table->time('salida_base'); // 22:00 / 22:00 / 22:00
            $table->string('break_tipo')->default('fijo'); // fijo (1h), ventana (5h con rango)
            $table->unsignedInteger('break_minutos')->default(60); // 60 o 300
            $table->string('descripcion')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('turnos');
    }
};
