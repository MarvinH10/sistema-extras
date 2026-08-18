<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empleado;
use App\Models\RegistroDiario;
use App\Models\Turno;
use App\Services\CalculoHorasExtraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RegistroDiarioController extends Controller
{
    public function __construct(
        protected CalculoHorasExtraService $calculoService
    ) {}

    public function storeOrUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'empleado_id' => 'required|exists:empleados,id',
            'fecha' => 'required|date_format:Y-m-d',
            'turno_id' => 'nullable|exists:turnos,id',
            'turno_nombre' => 'nullable|string',
            'ingreso_1' => 'nullable|string',
            'salida_1' => 'nullable|string',
            'ingreso_2' => 'nullable|string',
            'salida_2' => 'nullable|string',
            'es_descanso' => 'boolean',
            'sin_restricciones' => 'boolean',
            'observaciones' => 'nullable|string',
        ]);

        $empleado = Empleado::findOrFail($validated['empleado_id']);

        $esDescanso = $request->boolean('es_descanso');
        $sinRestricciones = $request->boolean('sin_restricciones') || ($validated['turno_nombre'] ?? '') === 'SIN_RESTRICCIONES';

        // Determinar turno específico si se especificó para este día
        $turno = null;
        if (!empty($validated['turno_id'])) {
            $turno = Turno::find($validated['turno_id']);
        } elseif (!empty($validated['turno_nombre']) && !in_array(strtoupper($validated['turno_nombre']), ['AUTO', 'SIN_RESTRICCIONES'])) {
            $turno = Turno::where('nombre', strtoupper($validated['turno_nombre']))->first();
        }

        // Formatear horas
        $i1 = !empty($validated['ingreso_1']) ? substr(trim($validated['ingreso_1']), 0, 5) : null;
        $s1 = !empty($validated['salida_1']) ? substr(trim($validated['salida_1']), 0, 5) : null;
        $i2 = !empty($validated['ingreso_2']) ? substr(trim($validated['ingreso_2']), 0, 5) : null;
        $s2 = !empty($validated['salida_2']) ? substr(trim($validated['salida_2']), 0, 5) : null;

        $calculo = $this->calculoService->calcular(
            $turno,
            $validated['fecha'],
            $i1,
            $s1,
            $i2,
            $s2,
            $esDescanso,
            $sinRestricciones
        );

        $registro = RegistroDiario::updateOrCreate(
            [
                'empleado_id' => $empleado->id,
                'fecha' => $validated['fecha'],
            ],
            [
                'turno_detectado' => $calculo['turno_detectado'] ?? null,
                'turno_id' => $calculo['turno_id'] ?? null,
                'ingreso_1' => $i1,
                'salida_1' => $s1,
                'ingreso_2' => $i2,
                'salida_2' => $s2,
                'minutos_trabajados' => $calculo['minutos_trabajados'],
                'minutos_extra' => $calculo['minutos_extra'],
                'incompleto' => $calculo['incompleto'],
                'es_descanso' => $esDescanso,
                'sin_restricciones' => $sinRestricciones,
                'observaciones' => $validated['observaciones'] ?? null,
            ]
        );

        return response()->json([
            'registro' => $registro,
            'detalles_calculo' => $calculo['detalles'] ?? null,
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'turno_id' => 'nullable|exists:turnos,id',
            'turno_nombre' => 'nullable|string',
            'fecha' => 'required|date_format:Y-m-d',
            'ingreso_1' => 'nullable|string',
            'salida_1' => 'nullable|string',
            'ingreso_2' => 'nullable|string',
            'salida_2' => 'nullable|string',
            'es_descanso' => 'boolean',
            'sin_restricciones' => 'boolean',
        ]);

        $sinRestricciones = $request->boolean('sin_restricciones') || ($validated['turno_nombre'] ?? '') === 'SIN_RESTRICCIONES';

        $turno = null;
        if (!empty($validated['turno_id'])) {
            $turno = Turno::find($validated['turno_id']);
        } elseif (!empty($validated['turno_nombre']) && !in_array(strtoupper($validated['turno_nombre']), ['AUTO', 'SIN_RESTRICCIONES'])) {
            $turno = Turno::where('nombre', strtoupper($validated['turno_nombre']))->first();
        }

        $esDescanso = $request->boolean('es_descanso');

        $i1 = !empty($validated['ingreso_1']) ? substr(trim($validated['ingreso_1']), 0, 5) : null;
        $s1 = !empty($validated['salida_1']) ? substr(trim($validated['salida_1']), 0, 5) : null;
        $i2 = !empty($validated['ingreso_2']) ? substr(trim($validated['ingreso_2']), 0, 5) : null;
        $s2 = !empty($validated['salida_2']) ? substr(trim($validated['salida_2']), 0, 5) : null;

        $calculo = $this->calculoService->calcular(
            $turno,
            $validated['fecha'],
            $i1,
            $s1,
            $i2,
            $s2,
            $esDescanso,
            $sinRestricciones
        );

        return response()->json($calculo);
    }
}
