<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Empleado;
use App\Models\Turno;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AsistenciaApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_obtener_areas_y_turnos(): void
    {
        $responseAreas = $this->getJson('/api/areas');
        $responseAreas->assertStatus(200);
        $this->assertNotEmpty($responseAreas->json());

        $responseTurnos = $this->getJson('/api/turnos');
        $responseTurnos->assertStatus(200);
        $this->assertCount(4, $responseTurnos->json());
    }

    public function test_asistencia_diaria_endpoint(): void
    {
        $response = $this->getJson('/api/asistencias/diaria?fecha=2026-08-01');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'fecha',
                'areas' => [
                    '*' => [
                        'id',
                        'nombre',
                        'empleados' => [
                            '*' => [
                                'id',
                                'dni',
                                'nombres',
                                'turno',
                            ],
                        ],
                    ],
                ],
            ]);
    }

    public function test_guardar_marcaje_individual_y_calculo(): void
    {
        $empleado = Empleado::firstOrFail();

        $response = $this->postJson('/api/registros', [
            'empleado_id' => $empleado->id,
            'fecha' => '2026-08-01',
            'ingreso_1' => '12:55',
            'salida_1' => '17:00',
            'ingreso_2' => '18:00',
            'salida_2' => '22:30',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('registro.minutos_trabajados', 510)
            ->assertJsonPath('registro.minutos_extra', 30);
    }

    public function test_guardar_lote_y_matriz_mensual(): void
    {
        $empleados = Empleado::take(3)->get();
        $registros = [];

        foreach ($empleados as $emp) {
            $registros[] = [
                'empleado_id' => $emp->id,
                'ingreso_1' => '13:00',
                'salida_1' => '17:00',
                'ingreso_2' => '18:00',
                'salida_2' => '22:00',
            ];
        }

        $responseLote = $this->postJson('/api/asistencias/guardar-lote', [
            'fecha' => '2026-08-15',
            'registros' => $registros,
        ]);

        $responseLote->assertStatus(200)
            ->assertJsonPath('guardados_count', 3);

        $responseReporte = $this->getJson('/api/reportes/mensual?anio=2026&mes=8');
        $responseReporte->assertStatus(200)
            ->assertJsonStructure([
                'anio',
                'mes',
                'total_dias',
                'areas',
                'totales_por_dia',
            ]);
    }
}
