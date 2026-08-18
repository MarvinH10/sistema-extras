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

    public function test_auto_deteccion_turno_compartido(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '08:50', '13:30', '18:20', '22:00');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(480, $res['minutos_trabajados']);
        $this->assertEquals(0, $res['minutos_extra']);
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
        // 09:00 a 13:10 (250 min trabajados / 4h 10m). Base: 240 min (4h). Extras: +10 min
        $res = $this->service->calcular(null, '2026-08-01', '09:00', null, null, '13:10');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(250, $res['minutos_trabajados']);
        $this->assertEquals(10, $res['minutos_extra']);
    }

    public function test_auto_deteccion_part_time_4_horas_1405_a_1823(): void
    {
        // 14:05 a 18:23 (258 min). Base: 240 min (4h). Extras: +18 min.
        $res = $this->service->calcular(null, '2026-08-01', '14:05', null, null, '18:23');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(258, $res['minutos_trabajados']);
        $this->assertEquals(18, $res['minutos_extra']);
    }

    public function test_auto_deteccion_jornada_corrida_sin_descanso_8_horas(): void
    {
        // 16:10 a 23:35 sin descanso (445 min trabajados / 7h 25m).
        // Al superar 5h30, se auto-detecta como jornada corrida SIN_RESTRICCIONES con base 480 min (8h).
        // Extras: 445 - 480 = -35 min (déficit)
        $res = $this->service->calcular(null, '2026-08-01', '16:10', null, null, '23:35');

        $this->assertEquals('SIN_RESTRICCIONES', $res['turno_detectado']);
        $this->assertTrue($res['sin_restricciones']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(445, $res['minutos_trabajados']);
        $this->assertEquals(-35, $res['minutos_extra']);
    }

    public function test_turno_full_time_con_descanso_incompleto_menos_de_8_horas(): void
    {
        // 16:10 a 17:00 (50m) + 18:00 a 23:35 (335m) = 385 min trabajados. Base: 480 min.
        // Extras: 385 - 480 = -95 min
        $res = $this->service->calcular(null, '2026-08-01', '16:10', '17:00', '18:00', '23:35');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(385, $res['minutos_trabajados']);
        $this->assertEquals(-95, $res['minutos_extra']);
    }
}
