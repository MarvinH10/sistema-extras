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

    public function test_auto_deteccion_tarde_isla_rumi(): void
    {
        // 13:20 a 19:07 (347 min). Break 19:07 a 20:07 (60m). 20:07 a 22:13 (126 min).
        // Total: 473 min. Extras: -7 min
        $res = $this->service->calcular(null, '2026-08-01', '13:20', '19:07', '20:02', '22:13');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(473, $res['minutos_trabajados']);
        $this->assertEquals(-7, $res['minutos_extra']);
    }

    public function test_turno_compartido_hermosilla(): void
    {
        // Mañana: 09:00 a 13:04 (tope 13:00 = 240 min). Tarde: 18:01 a 22:05 (244 min). Total: 484 min (+4 min extras).
        $res = $this->service->calcular(null, '2026-08-01', '09:00', '13:04', '18:01', '22:05');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(484, $res['minutos_trabajados']);
        $this->assertEquals(4, $res['minutos_extra']);
    }

    public function test_auto_deteccion_part_time_4_horas(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '09:00', null, null, '13:10');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(250, $res['minutos_trabajados']);
        $this->assertEquals(10, $res['minutos_extra']);
    }

    public function test_auto_deteccion_turno_todo_el_dia(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '09:00', '14:00', '15:00', '22:45');

        $this->assertEquals('TODO_EL_DIA', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(765, $res['minutos_trabajados']);
        $this->assertEquals(285, $res['minutos_extra']);
    }
}
