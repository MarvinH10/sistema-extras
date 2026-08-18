<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Area extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'codigo',
        'orden',
    ];

    public function empleados(): HasMany
    {
        return $this->hasMany(Empleado::class);
    }
}
