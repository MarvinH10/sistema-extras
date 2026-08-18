<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegistroDiario extends Model
{
    use HasFactory;

    protected $table = 'registros_diarios';

    protected $fillable = [
        'empleado_id',
        'turno_id',
        'turno_detectado',
        'fecha',
        'ingreso_1',
        'salida_1',
        'ingreso_2',
        'salida_2',
        'minutos_trabajados',
        'minutos_extra',
        'incompleto',
        'es_descanso',
        'sin_restricciones',
        'observaciones',
    ];

    protected $casts = [
        'fecha' => 'date:Y-m-d',
        'minutos_trabajados' => 'integer',
        'minutos_extra' => 'integer',
        'incompleto' => 'boolean',
        'es_descanso' => 'boolean',
        'sin_restricciones' => 'boolean',
    ];

    public function empleado(): BelongsTo
    {
        return $this->belongsTo(Empleado::class);
    }

    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class);
    }
}
