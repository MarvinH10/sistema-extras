<?php

namespace Database\Seeders;

use App\Models\Area;
use Illuminate\Database\Seeder;

class AreaSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $areas = [
            ['nombre' => 'ENCARGADOS DE TIENDA', 'codigo' => 'ENC', 'orden' => 1],
            ['nombre' => 'TIENDA DAMA', 'codigo' => 'TDAM', 'orden' => 2],
            ['nombre' => 'TIENDA CABALLEROS', 'codigo' => 'TCAB', 'orden' => 3],
            ['nombre' => 'TIENDA ACCESORIOS', 'codigo' => 'TACC', 'orden' => 4],
            ['nombre' => 'TIENDA NIÑOS', 'codigo' => 'TNIN', 'orden' => 5],
            ['nombre' => 'TIENDA DEPORTE', 'codigo' => 'TDEP', 'orden' => 6],
            ['nombre' => 'TIENDA HOME', 'codigo' => 'THOM', 'orden' => 7],
            ['nombre' => 'CAJAS', 'codigo' => 'CAJ', 'orden' => 8],
            ['nombre' => 'MANTENIMIENTO/APOYO OPERATIVO', 'codigo' => 'MNT', 'orden' => 9],
            ['nombre' => 'ALMACÉN', 'codigo' => 'ALM', 'orden' => 10],
            ['nombre' => 'DIRECTORIO', 'codigo' => 'DIR', 'orden' => 11],
            ['nombre' => 'CONTABILIDAD/RRHH', 'codigo' => 'RRHH', 'orden' => 12],
            ['nombre' => 'MARKETING', 'codigo' => 'MKT', 'orden' => 13],
            ['nombre' => 'REPONEDORES', 'codigo' => 'REP', 'orden' => 14],
            ['nombre' => 'OPERACIONES/SISTEMAS', 'codigo' => 'OPS', 'orden' => 15],
        ];

        foreach ($areas as $area) {
            Area::updateOrCreate(
                ['nombre' => $area['nombre']],
                ['codigo' => $area['codigo'], 'orden' => $area['orden']]
            );
        }
    }
}
