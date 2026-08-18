<?php

namespace Database\Seeders;

use App\Models\Area;
use App\Models\Empleado;
use Illuminate\Database\Seeder;

class EmpleadoSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $areas = Area::all()->keyBy('nombre');

        $encargados = $areas->get('ENCARGADOS DE TIENDA');
        $dama = $areas->get('TIENDA DAMA');
        $caballeros = $areas->get('TIENDA CABALLEROS');
        $accesorios = $areas->get('TIENDA ACCESORIOS');
        $ninos = $areas->get('TIENDA NIÑOS');
        $deporte = $areas->get('TIENDA DEPORTE');
        $home = $areas->get('TIENDA HOME');
        $cajas = $areas->get('CAJAS');
        $mantenimiento = $areas->get('MANTENIMIENTO/APOYO OPERATIVO');
        $almacen = $areas->get('ALMACÉN');
        $directorio = $areas->get('DIRECTORIO');
        $rrhh = $areas->get('CONTABILIDAD/RRHH');
        $marketing = $areas->get('MARKETING');
        $reponedores = $areas->get('REPONEDORES');
        $operaciones = $areas->get('OPERACIONES/SISTEMAS');

        $plantilla = [
            // 1. ENCARGADOS DE TIENDA
            [
                'dni' => '44636053',
                'nombres' => 'GARCIA EUGENIO TABITA GELCYS',
                'cargo' => 'JEFA DE TIENDA',
                'area_id' => $encargados?->id,
                'activo' => true,
            ],
            [
                'dni' => '74990814',
                'nombres' => 'HERMOSILLA ESPINOZA MARIANET MEDALY',
                'cargo' => 'ASIS. DE ENCARGADA DE TIENDA',
                'area_id' => $encargados?->id,
                'activo' => true,
            ],

            // 2. TIENDA DAMA
            [
                'dni' => '46081598',
                'nombres' => 'AGUILAR LLUMI RAYSA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],
            [
                'dni' => '75137593',
                'nombres' => 'CAMPOS PALACIN ARELY ANTUHANELA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],
            [
                'dni' => '63286980',
                'nombres' => 'CASTAÑEDA HUARANGA CLIDA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],
            [
                'dni' => '76865947',
                'nombres' => 'ESPINOZA ESPINOZA YANET',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],
            [
                'dni' => '46561847',
                'nombres' => 'FERRUA QUISPE CAROLA ESTHER',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],
            [
                'dni' => '75178096',
                'nombres' => 'SANCHEZ DIAZ ZEIDI SHIRLEY',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],
            [
                'dni' => '48514750',
                'nombres' => 'PEREZ CERVANTES MELIZA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $dama?->id,
                'activo' => true,
            ],

            // 3. TIENDA CABALLEROS
            [
                'dni' => '71695216',
                'nombres' => 'ALVARADO LUGO DIANA CAROLINA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $caballeros?->id,
                'activo' => true,
            ],
            [
                'dni' => '71302988',
                'nombres' => 'AVILA CABRERA ÑOL MIJAE',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $caballeros?->id,
                'activo' => true,
            ],
            [
                'dni' => '48531039',
                'nombres' => 'CACHIQUE SABOYA ROELI',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $caballeros?->id,
                'activo' => true,
            ],
            [
                'dni' => '60595460',
                'nombres' => 'CLAUDIO ABAL SAWISHA ESMITH',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $caballeros?->id,
                'activo' => true,
            ],
            [
                'dni' => '72724478',
                'nombres' => 'HERMOZA PISCO MARCOS RONALDO',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $caballeros?->id,
                'activo' => true,
            ],

            // 4. TIENDA ACCESORIOS
            [
                'dni' => '76039015',
                'nombres' => 'ALARCON TUCTO JHOMAYRA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $accesorios?->id,
                'activo' => true,
            ],
            [
                'dni' => '73139029',
                'nombres' => 'EUGENIO HERRERA ELY CATTELINE',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $accesorios?->id,
                'activo' => true,
            ],
            [
                'dni' => '92572984',
                'nombres' => 'GARAY SANDOVAL YULISSA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $accesorios?->id,
                'activo' => true,
            ],
            [
                'dni' => '75571761',
                'nombres' => 'SANCHEZ LAZARO ANGHELA BLIANCA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $accesorios?->id,
                'activo' => true,
            ],

            // 5. TIENDA NIÑOS
            [
                'dni' => '73345065',
                'nombres' => 'CONTRERAS ECHEVARRIA FIORELA EVELYN',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $ninos?->id,
                'activo' => true,
            ],
            [
                'dni' => '76639756',
                'nombres' => 'GOMEZ REYNA ISELA OLINDA',
                'cargo' => 'ENCARGADA DE NIÑOS',
                'area_id' => $ninos?->id,
                'activo' => true,
            ],

            // 6. TIENDA DEPORTE
            [
                'dni' => '48259072',
                'nombres' => 'RAMIREZ DIAZ MARLENI',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $deporte?->id,
                'activo' => true,
            ],

            // 7. TIENDA HOME
            [
                'dni' => '74077852',
                'nombres' => 'ISLA RUMI ESMERALDA',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $home?->id,
                'activo' => true,
            ],
            [
                'dni' => '44631655',
                'nombres' => 'VALDERRAMA HERRERA MIGUEL ANGEL',
                'cargo' => 'VENDEDOR(A)',
                'area_id' => $home?->id,
                'activo' => true,
            ],

            // 8. CAJAS
            [
                'dni' => '73529573',
                'nombres' => 'ALEJO RAMOS YENSY DEYLY',
                'cargo' => 'CAJERO(A)',
                'area_id' => $cajas?->id,
                'activo' => true,
            ],
            [
                'dni' => '70971955',
                'nombres' => 'MARTEL ORBEZO JHONATAN PIERO',
                'cargo' => 'CAJERO(A)',
                'area_id' => $cajas?->id,
                'activo' => true,
            ],
            [
                'dni' => '74891624',
                'nombres' => 'SILVESTRE TRUJILLO YARIDZA CORAYMA',
                'cargo' => 'CAJERO(A)',
                'area_id' => $cajas?->id,
                'activo' => true,
            ],

            // 9. MANTENIMIENTO/APOYO OPERATIVO
            [
                'dni' => '42300601',
                'nombres' => 'MORALES UGARTE CLEDY MERY',
                'cargo' => 'LIMPIEZA',
                'area_id' => $mantenimiento?->id,
                'activo' => true,
            ],

            // 10. ALMACÉN
            [
                'dni' => '73946345',
                'nombres' => 'SACRAMENTO AGUILAR JOAN MARK',
                'cargo' => 'JEFE DE LOGISTICA Y DISTRIBUCION',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '63935085',
                'nombres' => 'CASTAÑEDA HUARANGA PABLO',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '43050205',
                'nombres' => 'HUARAUYA ISLA VITALIA',
                'cargo' => 'COORDINADORA DE DISTRIBUCION',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '47086154',
                'nombres' => 'MARTEL JOAQUIN JHON JORGE',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '45154114',
                'nombres' => 'PALOMINO ISLA MARDONIO',
                'cargo' => 'CHOFER/ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '46971937',
                'nombres' => 'ROJAS BERNARDO ELVIS RODRIGO',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '22521795',
                'nombres' => 'SALAS CONTRERAS JUAN ELEUTERIO',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '76436052',
                'nombres' => 'SOLIS MELCHOR JHOSMEL ORLANDO',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '72643066',
                'nombres' => 'TERRAN PARRA LUIS ANDRE',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],
            [
                'dni' => '72356758',
                'nombres' => 'TOLENTINO SIMON FELIX ENRIQUE',
                'cargo' => 'ALMACENERO',
                'area_id' => $almacen?->id,
                'activo' => true,
            ],

            // 11. DIRECTORIO
            [
                'dni' => '76486052',
                'nombres' => 'PANTALEON LEON LUPESINO',
                'cargo' => 'DIRECTORIO',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],
            [
                'dni' => '70161850',
                'nombres' => 'PANTALEON VARA KAREN',
                'cargo' => 'DIRECTORIO',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],
            [
                'dni' => '70853849',
                'nombres' => 'PANTALEON VARA JORGE LUIS',
                'cargo' => 'DIRECTORIO',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],
            [
                'dni' => '73438098',
                'nombres' => 'PANTALEON VARA ROOSEVELT',
                'cargo' => 'DIRECTORIO',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],
            [
                'dni' => '42927898',
                'nombres' => 'SANTOS RAMOS PILAR CAROLINA',
                'cargo' => 'GERENTA DE OPERACIONES',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],
            [
                'dni' => '42734658',
                'nombres' => 'ZEVALLOS MATOS FREDY',
                'cargo' => 'DIRECTORIO',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],
            [
                'dni' => '74553660',
                'nombres' => 'VARA HERMOSILLA LUCY',
                'cargo' => 'DIRECTORIO',
                'area_id' => $directorio?->id,
                'activo' => true,
            ],

            // 12. CONTABILIDAD/RRHH
            [
                'dni' => '46387371',
                'nombres' => 'AGUIRRE PANTALEON YANETT MARLENE',
                'cargo' => 'RESPONSABLE DE CONTROL Y CUSTODIA',
                'area_id' => $rrhh?->id,
                'activo' => true,
            ],
            [
                'dni' => '76351758',
                'nombres' => 'AYALA RUPAY MARYORY ROCIO',
                'cargo' => 'JEFA DE CONTABILIDAD Y FINANZAS',
                'area_id' => $rrhh?->id,
                'activo' => true,
            ],
            [
                'dni' => '71892402',
                'nombres' => 'CARILLO APONTE ELIANA ROCIO',
                'cargo' => 'AUXILIAR DE TESORERIA Y PAGOS',
                'area_id' => $rrhh?->id,
                'activo' => true,
            ],
            [
                'dni' => '75179992',
                'nombres' => 'ENCARNACIÓN HERRERA LUCY CARMELA',
                'cargo' => 'ENC. DE DESARROLLO SISTEMAS E INFRAESTRUCTURA',
                'area_id' => $rrhh?->id,
                'activo' => true,
            ],
            [
                'dni' => '77105566',
                'nombres' => 'GUARDIAN PAJARES LUISA ALESSANDRA',
                'cargo' => 'AUXILIAR DE ARCHIVO Y CONTROL DOCUMENTARIO',
                'area_id' => $rrhh?->id,
                'activo' => true,
            ],
            [
                'dni' => '77205274',
                'nombres' => 'MELGAR MORENO MELANY',
                'cargo' => 'AUXILIAR DE RRHH Y PLANILLA',
                'area_id' => $rrhh?->id,
                'activo' => true,
            ],

            // 13. MARKETING
            [
                'dni' => '71879483',
                'nombres' => 'DEL VALLE BOCANGEL VIVIANA MARINA',
                'cargo' => 'JEFA DE MARKETING',
                'area_id' => $marketing?->id,
                'activo' => true,
            ],
            [
                'dni' => '77085267',
                'nombres' => 'BERROSPI GONZALES BRYANN',
                'cargo' => 'DISEÑADOR GRAFICO DIGITAL',
                'area_id' => $marketing?->id,
                'activo' => true,
            ],
            [
                'dni' => '75445684',
                'nombres' => 'POVES ESPIRITU MADELEIN MIRELLA',
                'cargo' => 'ASISTENTE DE E-COMMERCE Y ATENCION AL CLIENTE',
                'area_id' => $marketing?->id,
                'activo' => true,
            ],

            // 14. REPONEDORES
            [
                'dni' => '40991810',
                'nombres' => 'CONTRERAS ZAMBRANO SILVIA',
                'cargo' => 'REPONEDOR(A)',
                'area_id' => $reponedores?->id,
                'activo' => true,
            ],
            [
                'dni' => '43375220',
                'nombres' => 'CARLOS FUENTES DIANA',
                'cargo' => 'REPONEDOR(A)',
                'area_id' => $reponedores?->id,
                'activo' => true,
            ],
            [
                'dni' => '60368516',
                'nombres' => 'HERRERA MENDOZA BANNY',
                'cargo' => 'REPONEDOR(A)',
                'area_id' => $reponedores?->id,
                'activo' => true,
            ],
            [
                'dni' => '74891630',
                'nombres' => 'PALACIOS GALLO YANIRA',
                'cargo' => 'REPONEDOR(A)',
                'area_id' => $reponedores?->id,
                'activo' => true,
            ],

            // 15. OPERACIONES/SISTEMAS
            [
                'dni' => '75179991',
                'nombres' => 'CAMPOS DEZA MARVIN HECTOR',
                'cargo' => 'ING. DE SISTEMAS',
                'area_id' => $operaciones?->id,
                'activo' => true,
            ],
            [
                'dni' => '48483845',
                'nombres' => 'SALAZAR ALBINO IVAN YOEL',
                'cargo' => 'COORDINADOR DE SISTEMAS',
                'area_id' => $operaciones?->id,
                'activo' => true,
            ],
        ];

        foreach ($plantilla as $emp) {
            Empleado::updateOrCreate(
                ['dni' => $emp['dni']],
                $emp
            );
        }
    }
}
