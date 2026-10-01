<?php

namespace Tests\Feature;

use App\Models\Area;
use App\Models\Empleado;
use App\Models\RegistroDiario;
use App\Models\Turno;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\IOFactory;
use Tests\TestCase;

/**
 * Los reportes deben aplicar siempre las reglas vigentes.
 *
 * Un registro guardado con reglas anteriores conserva en la tabla los minutos
 * de entonces (por ejemplo la base 10:00 aplicada a un dia de septiembre). Ni
 * la matriz mensual ni el Excel pueden mostrar ese valor viejo, porque la
 * captura diaria y el editor de celda ya muestran el recalculado.
 */
class ReporteRecalculaRegistrosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    /**
     * Caso real: CAMPOS PALACIN del 2026-09-01, turno COMPARTIDO.
     * Marcajes 09:00 / 13:04 / 18:00 / 22:07.
     * Con el horario anterior la sesion de manana vale 240 min (09:00-13:00),
     * mas 247 de la tarde = 487 trabajados => +7 min.
     * Guardado con la base 10:00 daba 427 trabajados => -53 min.
     */
    private function crearRegistroCompartidoSeptiembre(): RegistroDiario
    {
        $turno = Turno::where('nombre', 'COMPARTIDO')->firstOrFail();

        return RegistroDiario::create([
            'empleado_id' => Empleado::firstOrFail()->id,
            'turno_id' => $turno->id,
            'turno_detectado' => 'COMPARTIDO',
            'fecha' => '2026-09-01',
            'ingreso_1' => '09:00',
            'salida_1' => '13:04',
            'ingreso_2' => '18:00',
            'salida_2' => '22:07',
            // Valores guardados con la base 10:00, antes del versionado por fecha.
            'minutos_trabajados' => 427,
            'minutos_extra' => -53,
            'incompleto' => false,
            'es_descanso' => false,
            'sin_restricciones' => false,
        ]);
    }

    public function test_matriz_mensual_recalcula_registro_guardado_con_reglas_viejas(): void
    {
        $this->crearRegistroCompartidoSeptiembre();

        $response = $this->getJson('/api/reportes/mensual?anio=2026&mes=9');
        $response->assertStatus(200);

        $dia = $response->json('areas.0.empleados.0.dias.1');

        $this->assertSame(487, $dia['minutos_trabajados'], 'Debe recalcular los minutos trabajados con las reglas vigentes.');
        $this->assertSame(7, $dia['minutos_extra'], 'Debe recalcular los minutos extras con las reglas vigentes.');
    }

    public function test_totales_de_la_matriz_suman_los_minutos_recalculados(): void
    {
        $this->crearRegistroCompartidoSeptiembre();

        $response = $this->getJson('/api/reportes/mensual?anio=2026&mes=9');
        $response->assertStatus(200)
            ->assertJsonPath('totales_por_dia.1', 7)
            ->assertJsonPath('gran_total_minutos_extra', 7);
    }

    public function test_el_reporte_no_altera_los_datos_guardados(): void
    {
        $registro = $this->crearRegistroCompartidoSeptiembre();

        $this->getJson('/api/reportes/mensual?anio=2026&mes=9')->assertStatus(200);

        $this->assertDatabaseHas('registros_diarios', [
            'id' => $registro->id,
            'minutos_extra' => -53,
            'minutos_trabajados' => 427,
        ]);
    }

    public function test_el_excel_exporta_los_minutos_recalculados(): void
    {
        $this->crearRegistroCompartidoSeptiembre();

        $response = $this->get('/api/reportes/mensual/export?anio=2026&mes=9');
        $response->assertStatus(200);
        $this->assertSame(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            $response->headers->get('Content-Type')
        );

        // Se abre el archivo generado y se lee la celda del día 1 (columna E).
        $ruta = tempnam(sys_get_temp_dir(), 'extras_').'.xlsx';
        file_put_contents($ruta, $response->streamedContent());

        $hoja = IOFactory::load($ruta)->getActiveSheet();

        // Fila 3 = cabecera de área, fila 4 = primer empleado.
        $celda = $hoja->getCell('E4')->getValue();
        $total = $hoja->getCell('AI4')->getValue();

        @unlink($ruta);

        $this->assertSame(7, (int) $celda, 'El Excel debe exportar los minutos extras recalculados.');
        $this->assertSame(7, (int) $total, 'El total de la fila debe usar los minutos recalculados.');
    }

    public function test_respeta_registros_sin_restricciones(): void
    {
        $empleado = Empleado::firstOrFail();

        RegistroDiario::create([
            'empleado_id' => $empleado->id,
            'turno_detectado' => 'SIN_RESTRICCIONES',
            'fecha' => '2026-09-01',
            'ingreso_1' => '08:50',
            'salida_1' => '11:09',
            'ingreso_2' => '16:00',
            'salida_2' => '22:42',
            'minutos_trabajados' => 541,
            'minutos_extra' => 61,
            'incompleto' => false,
            'es_descanso' => false,
            'sin_restricciones' => true,
        ]);

        $dia = $this->getJson('/api/reportes/mensual?anio=2026&mes=9')
            ->assertStatus(200)
            ->json('areas.0.empleados.0.dias.1');

        $this->assertSame(541, $dia['minutos_trabajados']);
        $this->assertSame(61, $dia['minutos_extra']);
    }

    public function test_respeta_dias_de_descanso(): void
    {
        $empleado = Empleado::firstOrFail();

        RegistroDiario::create([
            'empleado_id' => $empleado->id,
            'turno_detectado' => 'COMPARTIDO',
            'fecha' => '2026-09-01',
            'minutos_trabajados' => 0,
            'minutos_extra' => 0,
            'incompleto' => false,
            'es_descanso' => true,
            'sin_restricciones' => false,
        ]);

        $dia = $this->getJson('/api/reportes/mensual?anio=2026&mes=9')
            ->assertStatus(200)
            ->json('areas.0.empleados.0.dias.1');

        $this->assertSame(0, $dia['minutos_extra']);
        $this->assertTrue($dia['es_descanso']);
    }

    public function test_respeta_part_time(): void
    {
        $empleado = Empleado::firstOrFail();
        $turno = Turno::where('nombre', 'PART_TIME')->firstOrFail();

        RegistroDiario::create([
            'empleado_id' => $empleado->id,
            'turno_id' => $turno->id,
            'turno_detectado' => 'PART_TIME',
            'fecha' => '2026-09-01',
            'ingreso_1' => '18:07',
            'salida_2' => '22:07',
            'minutos_trabajados' => 240,
            'minutos_extra' => 0,
            'incompleto' => false,
            'es_descanso' => false,
            'sin_restricciones' => false,
        ]);

        $dia = $this->getJson('/api/reportes/mensual?anio=2026&mes=9')
            ->assertStatus(200)
            ->json('areas.0.empleados.0.dias.1');

        $this->assertSame(240, $dia['minutos_trabajados']);
        $this->assertSame(0, $dia['minutos_extra']);
    }

    public function test_area_sin_registros_devuelve_dias_nulos(): void
    {
        $response = $this->getJson('/api/reportes/mensual?anio=2026&mes=9');
        $response->assertStatus(200);

        $this->assertNotEmpty($response->json('areas'));
        $this->assertNull($response->json('areas.0.empleados.0.dias.1'));
    }

    public function test_filtrado_por_area_sigue_funcionando(): void
    {
        $area = Area::where('nombre', 'LIKE', '%TIENDA DAMA%')->firstOrFail();

        $response = $this->getJson("/api/reportes/mensual?anio=2026&mes=9&area_id={$area->id}");
        $response->assertStatus(200)->assertJsonPath('total_empleados', $area->empleados()->where('activo', true)->count());
    }
}
