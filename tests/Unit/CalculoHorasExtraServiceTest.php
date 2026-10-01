<?php

namespace Tests\Unit;

use App\Models\Turno;
use App\Services\CalculoHorasExtraService;
use Tests\TestCase;

class CalculoHorasExtraServiceTest extends TestCase
{
    private const F_ANTIGUA = '2026-09-15'; // Antes del cambio de horario

    private const F_VIGENTE = '2026-10-01'; // Desde el cambio de horario

    private CalculoHorasExtraService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new CalculoHorasExtraService();
    }

    public function test_auto_deteccion_turno_tarde(): void
    {
        $res = $this->service->calcular(null, self::F_VIGENTE, '12:45', '17:00', '17:45', '22:30');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(510, $res['minutos_trabajados']);
        $this->assertEquals(30, $res['minutos_extra']);
    }

    public function test_auto_deteccion_tarde_isla_rumi(): void
    {
        // 13:20 a 19:07 (347 min). Break 19:07 a 20:07 (60m). 20:07 a 22:13 (126 min).
        // Total: 473 min. Extras: -7 min
        $res = $this->service->calcular(null, self::F_VIGENTE, '13:20', '19:07', '20:02', '22:13');

        $this->assertEquals('TARDE', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(473, $res['minutos_trabajados']);
        $this->assertEquals(-7, $res['minutos_extra']);
    }

    public function test_auto_deteccion_part_time_4_horas(): void
    {
        $res = $this->service->calcular(null, self::F_VIGENTE, '10:00', null, null, '14:10');

        $this->assertEquals('PART_TIME', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(250, $res['minutos_trabajados']);
        $this->assertEquals(10, $res['minutos_extra']);
    }

    public function test_auto_deteccion_turno_todo_el_dia(): void
    {
        // Base 10:00. Mañana 10:00 a 14:00 (240 min). Break 1h. Tarde 15:00 a 22:45 (465 min). Total 705 (+225).
        $res = $this->service->calcular(null, self::F_VIGENTE, '10:00', '14:00', '15:00', '22:45');

        $this->assertEquals('TODO_EL_DIA', $res['turno_detectado']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(705, $res['minutos_trabajados']);
        $this->assertEquals(225, $res['minutos_extra']);
    }

    // ---------------------------------------------------------------------
    // Horario vigente (desde 2026-10-01): COMPARTIDO 10:00-13:00 / 16:30-21:30
    // ---------------------------------------------------------------------

    public function test_compartido_vigente_jornada_exacta(): void
    {
        // Llega 09:50 (antes de la base) => computa 10:00. Salida break 13:30 => tope 13:00 (180 min).
        // Regreso 16:20 (antes de la base) => computa 16:30. Salida 21:30 => tope 21:30 (300 min). Total 480.
        $res = $this->service->calcular(null, self::F_VIGENTE, '09:50', '13:30', '16:20', '21:30');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertEquals('VIGENTE', $res['detalles']['horario']);
        $this->assertFalse($res['incompleto']);
        $this->assertEquals(480, $res['minutos_trabajados']);
        $this->assertEquals(0, $res['minutos_extra']);
    }

    public function test_compartido_vigente_extras_hermosilla(): void
    {
        // Mañana: 10:00 a 13:00 (180 min). Tarde: 16:31 a 21:35 (304 min). Total 484 (+4).
        $res = $this->service->calcular(null, self::F_VIGENTE, '10:00', '13:04', '16:31', '21:35');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertEquals(484, $res['minutos_trabajados']);
        $this->assertEquals(4, $res['minutos_extra']);
    }

    public function test_compartido_vigente_detecta_break_corto(): void
    {
        // Break de 170 min (13:30 a 16:20): con el umbral vigente (120) sigue siendo COMPARTIDO.
        $res = $this->service->calcular(null, self::F_VIGENTE, '10:00', '13:30', '16:20', '21:30');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
    }

    public function test_todo_el_dia_vigente_entrada_base_10(): void
    {
        // Llega 09:45 antes de la base 10:00 => computa 10:00 (no antes).
        $res = $this->service->calcular(null, self::F_VIGENTE, '09:45', '14:00', '15:00', '22:00');

        $this->assertEquals('TODO_EL_DIA', $res['turno_detectado']);
        $this->assertEquals('VIGENTE', $res['detalles']['horario']);
        $this->assertEquals('10:00', $res['detalles']['ingreso_efectivo']);
        $this->assertEquals(660, $res['minutos_trabajados']);
        $this->assertEquals(180, $res['minutos_extra']);
    }

    // ---------------------------------------------------------------------
    // Horario anterior (hasta 2026-09-30): COMPARTIDO 09:00-13:00 / 18:00-22:00
    // ---------------------------------------------------------------------

    public function test_compartido_anterior_jornada_exacta(): void
    {
        // Mañana 09:00 a 13:00 (240 min). Tarde 18:00 a 22:00 (240 min). Total 480.
        $res = $this->service->calcular(null, self::F_ANTIGUA, '09:00', '13:00', '18:00', '22:00');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertEquals('ANTERIOR', $res['detalles']['horario']);
        $this->assertEquals(480, $res['minutos_trabajados']);
        $this->assertEquals(0, $res['minutos_extra']);
    }

    public function test_compartido_anterior_extras_hermosilla(): void
    {
        // Mañana: 09:00 a 13:04 (tope 13:00 = 240 min). Tarde: 18:01 a 22:05 (244 min). Total 484 (+4).
        $res = $this->service->calcular(null, self::F_ANTIGUA, '09:00', '13:04', '18:01', '22:05');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertEquals('ANTERIOR', $res['detalles']['horario']);
        $this->assertEquals(484, $res['minutos_trabajados']);
        $this->assertEquals(4, $res['minutos_extra']);
    }

    public function test_compartido_anterior_tarda_no_tiene_tope_de_salida(): void
    {
        // En el horario anterior la salida final era la hora real, sin tope a las 22:00.
        // Sale 20:00 => tarde 18:00 a 20:00 (120 min) + mañana 240 = 360 min (-120).
        $res = $this->service->calcular(null, self::F_ANTIGUA, '09:00', '13:00', '18:00', '20:00');

        $this->assertEquals('COMPARTIDO', $res['turno_detectado']);
        $this->assertEquals('20:00', $res['detalles']['salida_efectiva']);
        $this->assertEquals(360, $res['minutos_trabajados']);
        $this->assertEquals(-120, $res['minutos_extra']);
    }

    public function test_todo_el_dia_anterior_entrada_base_09(): void
    {
        // Con el horario anterior la mañana arranca 09:00 => 300 min + 420 = 720 (+240).
        $res = $this->service->calcular(null, self::F_ANTIGUA, '09:00', '14:00', '15:00', '22:00');

        $this->assertEquals('TODO_EL_DIA', $res['turno_detectado']);
        $this->assertEquals('ANTERIOR', $res['detalles']['horario']);
        $this->assertEquals('09:00', $res['detalles']['ingreso_efectivo']);
        $this->assertEquals(720, $res['minutos_trabajados']);
        $this->assertEquals(240, $res['minutos_extra']);
    }

    public function test_umbral_break_difiere_por_fecha(): void
    {
        // Break de 170 min. Antes del cambio el umbral era 180 => TODO_EL_DIA.
        $antigua = $this->service->calcular(null, self::F_ANTIGUA, '10:00', '13:30', '16:20', '21:30');
        $this->assertEquals('TODO_EL_DIA', $antigua['turno_detectado']);

        // Desde el cambio el umbral es 120 => COMPARTIDO.
        $vigente = $this->service->calcular(null, self::F_VIGENTE, '10:00', '13:30', '16:20', '21:30');
        $this->assertEquals('COMPARTIDO', $vigente['turno_detectado']);
    }

    public function test_turno_de_bd_respeta_fecha(): void
    {
        // Un turno de la BD (entrada_base 10:00) debe usar 09:00 para fechas anteriores al cambio.
        $turno = new Turno([
            'nombre' => 'COMPARTIDO',
            'entrada_base' => '10:00',
            'salida_base' => '21:30',
            'break_minutos' => 210,
        ]);

        $antigua = $this->service->calcular($turno, self::F_ANTIGUA, '09:00', '13:00', '18:00', '22:00');
        $this->assertEquals('09:00', $antigua['detalles']['ingreso_efectivo']);
        $this->assertEquals(480, $antigua['minutos_trabajados']);

        $vigente = $this->service->calcular($turno, self::F_VIGENTE, '10:00', '13:00', '16:30', '21:30');
        $this->assertEquals('10:00', $vigente['detalles']['ingreso_efectivo']);
        $this->assertEquals(480, $vigente['minutos_trabajados']);
    }

    public function test_frontera_del_cambio_de_horario(): void
    {
        $this->assertFalse($this->service->esFechaHorarioNuevo('2026-09-30'));
        $this->assertTrue($this->service->esFechaHorarioNuevo('2026-10-01'));
        $this->assertTrue($this->service->esFechaHorarioNuevo('2026-12-31'));
        $this->assertFalse($this->service->esFechaHorarioNuevo('2026-01-15'));
    }
}