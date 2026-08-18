<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Turno;
use Illuminate\Http\JsonResponse;

class TurnoController extends Controller
{
    public function index(): JsonResponse
    {
        $turnos = Turno::withCount('empleados')->get();

        return response()->json($turnos);
    }
}
