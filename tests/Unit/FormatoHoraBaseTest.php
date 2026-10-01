<?php

namespace Tests\Unit;

use App\Models\Turno;
use App\Services\CalculoHorasExtraService;
use Tests\TestCase;

/**
 * Las columnas TIME se devuelven distinto según el motor:
 *   - SQLite  -> "10:00"
 *   - MySQL / MariaDB (producción) -> "10:00:00"
 *
 * Si el servicio compara contra "10:00" sin normalizar, en producción nunca
 * coincide y el cambio de horario del 2026-10-01 no se aplica a las fechas
 * anteriores: un COMPARTIDO de septiembre se computaba con base 10:00 en vez de
 * 09:00, 60 minutos menos por día.
 */
class FormatoHoraBaseTest extends TestCase
{
    private CalculoHorasExtraService $servicio;

    protected function setUp(): void
    {
        parent::setUp();
        $this->servicio = new CalculoHorasExtraService;
    }

    private function turno(string $entradaBase): Turno
    {
        return new Turno([
            'nombre' => 'COMPARTIDO',
            'entrada_base' => $entradaBase,
            'salida_base' => '21:30',
            'break_tipo' => 'ventana',
            'break_minutos' => 210,
        ]);
    }

    public function test_compartido_anterior_usa_base_09_00_independiente_del_motor(): void
    {
        $marcajes = ['09:00', '13:04', '18:00', '22:07'];

        $sqlite = $this->servicio->calcular($this->turno('10:00'), '2026-09-01', ...$marcajes);
        $mysql = $this->servicio->calcular($this->turno('10:00:00'), '2026-09-01', ...$marcajes);

        // 09:00-13:00 (240) + 18:00-22:07 (247) = 487 min => +7
        $this->assertSame(487, $sqlite['minutos_trabajados']);
        $this->assertSame(7, $sqlite['minutos_extra']);
        $this->assertSame(487, $mysql['minutos_trabajados'], 'MySQL debe dar el mismo resultado que SQLite.');
        $this->assertSame(7, $mysql['minutos_extra'], 'MySQL debe dar el mismo resultado que SQLite.');
    }

    public function test_el_error_de_base_no_se_reintroduce(): void
    {
        // Con base 10:00 sobre un día de septiembre se obtenían 427 min y -53.
        $resultado = $this->servicio->calcular($this->turno('10:00:00'), '2026-09-01', '09:00', '13:04', '18:00', '22:07');

        $this->assertNotSame(427, $resultado['minutos_trabajados']);
        $this->assertNotSame(-53, $resultado['minutos_extra']);
    }

    public function test_todo_el_dia_anterior_usa_base_09_00_independiente_del_motor(): void
    {
        $marcajes = ['09:45', '14:00', '15:00', '22:45'];

        $sqlite = $this->servicio->calcular(
            new Turno(['nombre' => 'TODO_EL_DIA', 'entrada_base' => '10:00', 'salida_base' => '22:00', 'break_minutos' => 60]),
            '2026-09-01',
            ...$marcajes
        );
        $mysql = $this->servicio->calcular(
            new Turno(['nombre' => 'TODO_EL_DIA', 'entrada_base' => '10:00:00', 'salida_base' => '22:00', 'break_minutos' => 60]),
            '2026-09-01',
            ...$marcajes
        );

        // Ingreso efectivo 09:00 (llego antes) => 09:00-22:45 con break de 1h = 720 min
        $this->assertSame(720, $sqlite['minutos_trabajados']);
        $this->assertSame(720, $mysql['minutos_trabajados'], 'MySQL debe dar el mismo resultado que SQLite.');
        $this->assertSame(240, $sqlite['minutos_extra']);
        $this->assertSame(240, $mysql['minutos_extra'], 'MySQL debe dar el mismo resultado que SQLite.');
    }

    public function test_desde_el_cambio_la_base_sigue_siendo_10_00(): void
    {
        foreach (['10:00', '10:00:00'] as $formato) {
            $resultado = $this->servicio->calcular($this->turno($formato), '2026-10-01', '10:00', '13:04', '16:30', '21:30');

            // 10:00-13:00 (180) + 16:30-21:30 (300) = 480 min
            $this->assertSame(480, $resultado['minutos_trabajados'], "Fallo con entrada_base={$formato}");
            $this->assertSame(0, $resultado['minutos_extra'], "Fallo con entrada_base={$formato}");
        }
    }

    public function test_turnos_sin_hora_10_00_no_se_ven_afectados(): void
    {
        // TARDE tiene base 13:00: nunca debe remapearse, en ningun motor ni fecha.
        foreach (['13:00', '13:00:00'] as $formato) {
            foreach (['2026-09-01', '2026-10-01'] as $fecha) {
                $resultado = $this->servicio->calcular(
                    new Turno(['nombre' => 'TARDE', 'entrada_base' => $formato, 'salida_base' => '22:00', 'break_minutos' => 60]),
                    $fecha,
                    '13:00',
                    '17:00',
                    '18:00',
                    '22:00'
                );

                $this->assertSame(480, $resultado['minutos_trabajados'], "Fallo con {$formato} en {$fecha}");
                $this->assertSame(0, $resultado['minutos_extra'], "Fallo con {$formato} en {$fecha}");
            }
        }
    }
}
