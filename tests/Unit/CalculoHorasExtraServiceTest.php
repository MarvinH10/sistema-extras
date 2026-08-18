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
        // Sin pasar Turno, al ingresar 12:45 se auto-detecta TARDE
        $res = $this->service->calcular(null, '2026-08-01', '12:45', '17:00', '17:45', '22:30');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(510, $res['minutos_trabajados']); // 240 + 270 = 510
        $this->assertEquals(30, $res['minutos_extra']); // 510 - 480 = +30
    }

    public function test_auto_deteccion_turno_compartido(): void
    {
        // Sin pasar Turno, al ingresar 08:50 y tener break de 5 horas (13:30 a 18:30) se auto-detecta COMPARTIDO
        $res = $this->service->calcular(null, '2026-08-01', '08:50', '13:30', '18:20', '22:00');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(480, $res['minutos_trabajados']);
        $this->assertEquals(0, $res['minutos_extra']);
    }

    public function test_auto_deteccion_turno_todo_el_dia(): void
    {
        // Sin pasar Turno, al ingresar 09:00 y tener break de 1 hora (14:00 a 15:00) se auto-detecta TODO_EL_DIA
        $res = $this->service->calcular(null, '2026-08-01', '09:00', '14:00', '15:00', '22:45');

        $this->assertEquals('TODO_EL_DIA', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(765, $res['minutos_trabajados']);
        $this->assertEquals(285, $res['minutos_extra']);
    }

    public function test_horario_tabita_gelcys_con_horas_sin_cero(): void
    {
        $res = $this->service->calcular(null, '2026-08-01', '8:50', '13:33', '16:39', '23:40');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        // Ingreso computado: 09:00 a 13:33 = 273 min
        // Retorno computado (mín 5h desde 13:33 = 18:33): 18:33 a 23:40 = 307 min
        // Total trabajados: 273 + 307 = 580 min
        $this->assertEquals(580, $res['minutos_trabajados']);
        $this->assertEquals(100, $res['minutos_extra']);
    }

    public function test_horario_sin_restricciones(): void
    {
        // Con sin_restricciones = true, 08:50 a 13:33 (283 min) + 16:39 a 23:40 (421 min) = 704 min
        // Extras: 704 - 480 = +224 min
        $res = $this->service->calcular(null, '2026-08-01', '8:50', '13:33', '16:39', '23:40', false, true);

        $this->assertEquals('SIN_RESTRICCIONES', $res['turno_detectado']);
        $this->assertTrue($res['sin_restricciones']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(704, $res['minutos_trabajados']);
        $this->assertEquals(224, $res['minutos_extra']);
    }

    public function test_turno_part_time_4_horas(): void
    {
        // Avila Cabrera Ñol Mijae: 14:05 a 18:23 (258 min). Base: 240 min (4h). Extras: +18 min.
        $res = $this->service->calcular(null, '2026-08-01', '14:05', null, null, '18:23');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(258, $res['minutos_trabajados']);
        $this->assertEquals(18, $res['minutos_extra']);
    }
}
