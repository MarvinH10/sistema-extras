<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Empleado;
use App\Models\RegistroDiario;
use App\Models\Turno;
use App\Services\CalculoHorasExtraService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AsistenciaController extends Controller
{
    public function __construct(
        protected CalculoHorasExtraService $calculoService
    ) {}

    public function diaria(Request $request): JsonResponse
    {
        $fecha = $request->input('fecha', date('Y-m-d'));
        $areaId = $request->input('area_id');

        $queryAreas = Area::with(['empleados' => function ($q) use ($fecha) {
            $q->where('activo', true)
                ->with(['turno', 'registros' => function ($rq) use ($fecha) {
                    $rq->where('fecha', $fecha)->with('turno');
                }])
                ->orderBy('orden')
                ->orderBy('nombres');
        }])->orderBy('orden')->orderBy('nombre');

        if ($areaId) {
            $queryAreas->where('id', $areaId);
        }

        $areas = $queryAreas->get();

        $resultado = $areas->map(function ($area) {
            $empleadosConRegistro = $area->empleados->map(function ($emp) {
                $registro = $emp->registros->first();

                return [
                    'id' => $emp->id,
                    'dni' => $emp->dni,
                    'nombres' => $emp->nombres,
                    'cargo' => $emp->cargo,
                    'area_id' => $emp->area_id,
                    'turno' => $emp->turno ? [
                        'id' => $emp->turno->id,
                        'nombre' => $emp->turno->nombre,
                        'entrada_base' => $emp->turno->entrada_base,
                        'salida_base' => $emp->turno->salida_base,
                        'break_minutos' => $emp->turno->break_minutos,
                        'break_tipo' => $emp->turno->break_tipo,
                    ] : null,
                    'registro' => $registro ? [
                        'id' => $registro->id,
                        'turno_id' => $registro->turno_id,
                        'turno_detectado' => $registro->turno_detectado,
                        'ingreso_1' => $registro->ingreso_1 ? substr($registro->ingreso_1, 0, 5) : null,
                        'salida_1' => $registro->salida_1 ? substr($registro->salida_1, 0, 5) : null,
                        'ingreso_2' => $registro->ingreso_2 ? substr($registro->ingreso_2, 0, 5) : null,
                        'salida_2' => $registro->salida_2 ? substr($registro->salida_2, 0, 5) : null,
                        'minutos_trabajados' => $registro->minutos_trabajados,
                        'minutos_extra' => $registro->minutos_extra,
                        'incompleto' => $registro->incompleto,
                        'es_descanso' => $registro->es_descanso,
                        'sin_restricciones' => (bool) $registro->sin_restricciones,
                        'observaciones' => $registro->observaciones,
                    ] : null,
                ];
            });

            return [
                'id' => $area->id,
                'nombre' => $area->nombre,
                'codigo' => $area->codigo,
                'empleados' => $empleadosConRegistro,
            ];
        });

        return response()->json([
            'fecha' => $fecha,
            'areas' => $resultado,
        ]);
    }

    public function guardarLote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fecha' => 'required|date_format:Y-m-d',
            'registros' => 'required|array',
            'registros.*.empleado_id' => 'required|exists:empleados,id',
            'registros.*.turno_nombre' => 'nullable|string',
            'registros.*.turno_id' => 'nullable|exists:turnos,id',
            'registros.*.ingreso_1' => 'nullable|string',
            'registros.*.salida_1' => 'nullable|string',
            'registros.*.ingreso_2' => 'nullable|string',
            'registros.*.salida_2' => 'nullable|string',
            'registros.*.es_descanso' => 'nullable|boolean',
            'registros.*.sin_restricciones' => 'nullable|boolean',
            'registros.*.observaciones' => 'nullable|string',
        ]);

        $fecha = $validated['fecha'];
        $registrosData = $validated['registros'];

        $empleadoIds = collect($registrosData)->pluck('empleado_id')->unique();
        $empleados = Empleado::with('turno')->whereIn('id', $empleadoIds)->get()->keyBy('id');
        $allTurnos = Turno::all()->keyBy('nombre');

        $guardados = [];

        DB::transaction(function () use ($fecha, $registrosData, $empleados, $allTurnos, &$guardados) {
            foreach ($registrosData as $data) {
                $empleadoId = $data['empleado_id'];
                $emp = $empleados->get($empleadoId);
                if (!$emp) {
                    continue;
                }

                $esDescanso = !empty($data['es_descanso']);
                $sinRestricciones = !empty($data['sin_restricciones']) || (($data['turno_nombre'] ?? '') === 'SIN_RESTRICCIONES');
                $i1 = !empty($data['ingreso_1']) ? substr(trim($data['ingreso_1']), 0, 5) : null;
                $s1 = !empty($data['salida_1']) ? substr(trim($data['salida_1']), 0, 5) : null;
                $i2 = !empty($data['ingreso_2']) ? substr(trim($data['ingreso_2']), 0, 5) : null;
                $s2 = !empty($data['salida_2']) ? substr(trim($data['salida_2']), 0, 5) : null;

                // Turno específico opcional por fila o auto-detectado
                $turno = null;
                if (!empty($data['turno_nombre']) && !in_array(strtoupper($data['turno_nombre']), ['AUTO', 'SIN_RESTRICCIONES'])) {
                    $turno = $allTurnos->get(strtoupper($data['turno_nombre']));
                }

                $calculo = $this->calculoService->calcular(
                    $turno,
                    $fecha,
                    $i1,
                    $s1,
                    $i2,
                    $s2,
                    $esDescanso,
                    $sinRestricciones
                );

                $registro = RegistroDiario::updateOrCreate(
                    [
                        'empleado_id' => $emp->id,
                        'fecha' => $fecha,
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
                        'observaciones' => $data['observaciones'] ?? null,
                    ]
                );

                $guardados[] = $registro;
            }
        });

        return response()->json([
            'message' => 'Marcajes guardados exitosamente',
            'guardados_count' => count($guardados),
        ]);
    }
}
