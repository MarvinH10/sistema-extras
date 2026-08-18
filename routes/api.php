<?php

use App\Http\Controllers\Api\AreaController;
use App\Http\Controllers\Api\AsistenciaController;
use App\Http\Controllers\Api\EmpleadoController;
use App\Http\Controllers\Api\RegistroDiarioController;
use App\Http\Controllers\Api\ReporteController;
use App\Http\Controllers\Api\TurnoController;
use Illuminate\Support\Facades\Route;

Route::prefix('areas')->group(function () {
    Route::get('/', [AreaController::class, 'index']);
    Route::post('/', [AreaController::class, 'store']);
    Route::put('/{area}', [AreaController::class, 'update']);
    Route::delete('/{area}', [AreaController::class, 'destroy']);
});

Route::get('/turnos', [TurnoController::class, 'index']);

Route::prefix('empleados')->group(function () {
    Route::get('/', [EmpleadoController::class, 'index']);
    Route::post('/reordenar', [EmpleadoController::class, 'reordenar']);
    Route::post('/', [EmpleadoController::class, 'store']);
    Route::get('/{empleado}', [EmpleadoController::class, 'show']);
    Route::put('/{empleado}', [EmpleadoController::class, 'update']);
    Route::delete('/{empleado}', [EmpleadoController::class, 'destroy']);
});

Route::prefix('registros')->group(function () {
    Route::post('/', [RegistroDiarioController::class, 'storeOrUpdate']);
    Route::post('/preview', [RegistroDiarioController::class, 'preview']);
});

Route::prefix('asistencias')->group(function () {
    Route::get('/diaria', [AsistenciaController::class, 'diaria']);
    Route::post('/guardar-lote', [AsistenciaController::class, 'guardarLote']);
});

Route::prefix('reportes')->group(function () {
    Route::get('/mensual', [ReporteController::class, 'mensual']);
    Route::get('/mensual/export', [ReporteController::class, 'export']);
});
