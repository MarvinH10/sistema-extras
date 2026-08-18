<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Empleado;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EmpleadoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Empleado::with(['area', 'turno']);

        if ($request->filled('area_id')) {
            $query->where('area_id', $request->area_id);
        }

        if ($request->filled('turno_id')) {
            $query->where('turno_id', $request->turno_id);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombres', 'like', "%{$search}%")
                    ->orWhere('dni', 'like', "%{$search}%")
                    ->orWhere('cargo', 'like', "%{$search}%");
            });
        }

        if ($request->has('activo')) {
            $query->where('activo', filter_var($request->activo, FILTER_VALIDATE_BOOLEAN));
        }

        $empleados = $query->orderBy('orden')->orderBy('nombres')->get();

        return response()->json($empleados);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'dni' => 'required|string|max:20|unique:empleados,dni',
            'nombres' => 'required|string|max:255',
            'cargo' => 'nullable|string|max:255',
            'area_id' => 'required|exists:areas,id',
            'turno_id' => 'nullable|exists:turnos,id',
            'activo' => 'boolean',
            'orden' => 'nullable|integer',
        ]);

        $empleado = Empleado::create($validated);
        $empleado->load(['area', 'turno']);

        return response()->json($empleado, 201);
    }

    public function show(Empleado $empleado): JsonResponse
    {
        $empleado->load(['area', 'turno']);

        return response()->json($empleado);
    }

    public function update(Request $request, Empleado $empleado): JsonResponse
    {
        $validated = $request->validate([
            'dni' => 'required|string|max:20|unique:empleados,dni,' . $empleado->id,
            'nombres' => 'required|string|max:255',
            'cargo' => 'nullable|string|max:255',
            'area_id' => 'required|exists:areas,id',
            'turno_id' => 'nullable|exists:turnos,id',
            'activo' => 'boolean',
            'orden' => 'nullable|integer',
        ]);

        $empleado->update($validated);
        $empleado->load(['area', 'turno']);

        return response()->json($empleado);
    }

    public function destroy(Empleado $empleado): JsonResponse
    {
        $empleado->delete();

        return response()->json(['message' => 'Empleado eliminado exitosamente']);
    }

    public function reordenar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ordenes' => 'required|array',
            'ordenes.*.id' => 'required|exists:empleados,id',
            'ordenes.*.orden' => 'required|integer',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ordenes'] as $item) {
                Empleado::where('id', $item['id'])->update(['orden' => $item['orden']]);
            }
        });

        return response()->json(['message' => 'Posiciones actualizadas exitosamente']);
    }
}
