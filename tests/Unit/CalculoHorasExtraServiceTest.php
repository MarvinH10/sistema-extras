<?php

namespace Tests\Unit;

use App\Models\Turno;
use App\Services\CalculoHorasExtraService;
use Tests\TestCase;

class CalculoHorasExtraServiceTest extends TestCase
{
    private CalculoHorasExtraService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CalculoHorasExtraService();
    }

    public function test_auto_deteccion_turno_tarde(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '12:45', '17:00', '17:45', '22:30');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(510, $res['minutos_trabajados']);
        $this->assertEquals(30, $res['minutos_extra']);
    }

    public function test_turno_compartido_hermosilla_retorno_1801_salida_2205(): void
    {
        // Mañana: 09:00 a 13:04 (tope 13:00 = 240 min).
        // Tarde: 18:01 (1m demora) a 22:05 (244 min).
        // Total trabajados: 240 + 244 = 484 min (8h 04m).
        // Extras: 5 min extras al cierre - 1 min demora = +4 min extras.
        $res = $this->service->calcular(null, '2026-08-01', '09:00', '13:04', '18:01', '22:05');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(484, $res['minutos_trabajados']);
        $this->assertEquals(4, $res['minutos_extra']);
    }

    public function test_auto_deteccion_turno_todo_el_dia(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '09:00', '14:00', '15:00', '22:45');

        $this->assertEquals('TODO_EL_DIA', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(765, $res['minutos_trabajados']);
        $this->assertEquals(285, $res['minutos_extra']);
    }

    public function test_auto_deteccion_part_time_4_horas_0900_a_1310(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '09:00', null, null, '13:10');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(250, $res['minutos_trabajados']);
        $this->assertEquals(10, $res['minutos_extra']);
    }

    public function test_auto_deteccion_part_time_4_horas_1405_a_1823(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '14:05', null, null, '18:23');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(258, $res['minutos_trabajados']);
        $this->assertEquals(18, $res['minutos_extra']);
    }

    public function test_auto_deteccion_jornada_corrida_sin_descanso_8_horas(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '16:10', null, null, '23:35');

        $this->assertEquals('SIN_RESTRICCIONES', $res['turno_detectado']);
        $this->assertTrue($res['sin_restricciones']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(445, $res['minutos_trabajados']);
        $this->assertEquals(-35, $res['minutos_extra']);
    }

    public function test_turno_full_time_con_descanso_incompleto_menos_de_8_horas(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '16:10', '17:00', '18:00', '23:35');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(385, $res['minutos_trabajados']);
        $this->assertEquals(-95, $res['minutos_extra']);
    }
}
