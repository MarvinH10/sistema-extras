<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AreaController extends Controller
{
    public function index(): JsonResponse
    {
        $areas = Area::withCount('empleados')
            ->orderBy('orden')
            ->orderBy('nombre')
            ->get();

        return response()->json($areas);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo' => 'nullable|string|max:50',
            'orden' => 'nullable|integer',
        ]);

        $area = Area::create($validated);

        return response()->json($area, 201);
    }

    public function update(Request $request, Area $area): JsonResponse
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'codigo' => 'nullable|string|max:50',
            'orden' => 'nullable|integer',
        ]);

        $area->update($validated);

        return response()->json($area);
    }

    public function destroy(Area $area): JsonResponse
    {
        $area->delete();

        return response()->json(['message' => 'Área eliminada exitosamente']);
    }
}
