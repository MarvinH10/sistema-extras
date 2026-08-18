<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Turno extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'codigo',
        'entrada_base',
        'salida_base',
        'break_tipo',
        'break_minutos',
        'descripcion',
    ];

    protected $casts = [
        'break_minutos' => 'integer',
    ];

    public function empleados(): HasMany
    {
        return $this->hasMany(Empleado::class);
    }
}
