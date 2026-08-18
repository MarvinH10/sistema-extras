<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Area;
use App\Models\Empleado;
use App\Models\RegistroDiario;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReporteController extends Controller
{
    public function mensual(Request $request): JsonResponse
    {
        $anio = (int) $request->input('anio', date('Y'));
        $mes = (int) $request->input('mes', date('n'));
        $areaId = $request->input('area_id');

        $primerDia = Carbon::createFromDate($anio, $mes, 1)->startOfMonth();
        $ultimoDia = $primerDia->copy()->endOfMonth();
        $totalDias = $ultimoDia->day;

        $queryAreas = Area::with(['empleados' => function ($q) use ($primerDia, $ultimoDia) {
            $q->where('activo', true)
                ->with(['turno', 'registros' => function ($rq) use ($primerDia, $ultimoDia) {
                    $rq->whereBetween('fecha', [$primerDia->toDateString(), $ultimoDia->toDateString()]);
                }])
                ->orderBy('orden')
                ->orderBy('nombres');
        }])->orderBy('orden')->orderBy('nombre');

        if ($areaId) {
            $queryAreas->where('id', $areaId);
        }

        $areas = $queryAreas->get();

        $totalesPorDia = array_fill(1, $totalDias, 0);
        $granTotalMinutosExtra = 0;
        $totalEmpleados = 0;

        $areasData = $areas->map(function ($area) use ($totalDias, &$totalesPorDia, &$granTotalMinutosExtra, &$totalEmpleados) {
            $empleadosData = $area->empleados->map(function ($emp) use ($totalDias, &$totalesPorDia, &$granTotalMinutosExtra, &$totalEmpleados) {
                $totalEmpleados++;
                $registrosMap = $emp->registros->keyBy(function ($r) {
                    return (int) Carbon::parse($r->fecha)->day;
                });

                $dias = [];
                $totalMinutosExtra = 0;
                $totalMinutosTrabajados = 0;
                $diasTrabajados = 0;

                for ($d = 1; $d <= $totalDias; $d++) {
                    $reg = $registrosMap->get($d);

                    if ($reg) {
                        $minExtra = $reg->minutos_extra;
                        $minTrab = $reg->minutos_trabajados;

                        if ($minExtra !== null) {
                            $totalMinutosExtra += $minExtra;
                            $totalesPorDia[$d] += $minExtra;
                            $granTotalMinutosExtra += $minExtra;
                        }
                        if ($minTrab !== null) {
                            $totalMinutosTrabajados += $minTrab;
                            $diasTrabajados++;
                        }

                        $dias[$d] = [
                            'id' => $reg->id,
                            'fecha' => $reg->fecha->format('Y-m-d'),
                            'turno_detectado' => $reg->turno_detectado,
                            'minutos_extra' => $minExtra,
                            'minutos_trabajados' => $minTrab,
                            'incompleto' => $reg->incompleto,
                            'es_descanso' => $reg->es_descanso,
                            'sin_restricciones' => (bool) $reg->sin_restricciones,
                            'ingreso_1' => $reg->ingreso_1 ? substr($reg->ingreso_1, 0, 5) : null,
                            'salida_1' => $reg->salida_1 ? substr($reg->salida_1, 0, 5) : null,
                            'ingreso_2' => $reg->ingreso_2 ? substr($reg->ingreso_2, 0, 5) : null,
                            'salida_2' => $reg->salida_2 ? substr($reg->salida_2, 0, 5) : null,
                            'observaciones' => $reg->observaciones,
                        ];
                    } else {
                        $dias[$d] = null;
                    }
                }

                return [
                    'id' => $emp->id,
                    'dni' => $emp->dni,
                    'nombres' => $emp->nombres,
                    'cargo' => $emp->cargo,
                    'area_id' => $emp->area_id,
                    'turno' => $emp->turno ? [
                        'id' => $emp->turno->id,
                        'nombre' => $emp->turno->nombre,
                        'codigo' => $emp->turno->codigo,
                    ] : null,
                    'dias' => $dias,
                    'total_minutos_extra' => $totalMinutosExtra,
                    'total_minutos_trabajados' => $totalMinutosTrabajados,
                    'dias_trabajados' => $diasTrabajados,
                ];
            });

            return [
                'id' => $area->id,
                'nombre' => $area->nombre,
                'codigo' => $area->codigo,
                'empleados' => $empleadosData,
            ];
        });

        return response()->json([
            'anio' => $anio,
            'mes' => $mes,
            'nombre_mes' => $primerDia->locale('es')->monthName,
            'total_dias' => $totalDias,
            'totales_por_dia' => $totalesPorDia,
            'gran_total_minutos_extra' => $granTotalMinutosExtra,
            'total_empleados' => $totalEmpleados,
            'areas' => $areasData,
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $anio = (int) $request->input('anio', date('Y'));
        $mes = (int) $request->input('mes', date('n'));

        $primerDia = Carbon::createFromDate($anio, $mes, 1)->startOfMonth();
        $ultimoDia = $primerDia->copy()->endOfMonth();
        $totalDias = $ultimoDia->day;
        $mesNombre = strtoupper($primerDia->locale('es')->monthName);

        $areas = Area::with(['empleados' => function ($q) use ($primerDia, $ultimoDia) {
            $q->where('activo', true)
                ->with(['turno', 'registros' => function ($rq) use ($primerDia, $ultimoDia) {
                    $rq->whereBetween('fecha', [$primerDia->toDateString(), $ultimoDia->toDateString()]);
                }])
                ->orderBy('orden')
                ->orderBy('nombres');
        }])->orderBy('orden')->orderBy('nombre')->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle(substr("EXTRAS_{$mesNombre}", 0, 31));

        // Título Principal
        $sheet->setCellValue('A1', "CONTROL DE HORAS EXTRAS POR MINUTO - {$mesNombre} {$anio}");
        $sheet->mergeCells("A1:AJ1");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFFFFF'));
        $sheet->getStyle('A1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('1E293B');
        $sheet->getStyle('A1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(30);

        // Cabeceras de Columnas
        $sheet->setCellValue('A2', 'N°');
        $sheet->setCellValue('B2', 'DNI');
        $sheet->setCellValue('C2', 'NOMBRES Y APELLIDOS');
        $sheet->setCellValue('D2', 'CARGO');

        $colIdx = 5; // Columna E (Días 1 a 31)
        for ($d = 1; $d <= $totalDias; $d++) {
            $colLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
            $sheet->setCellValue("{$colLetter}2", $d);
            $sheet->getColumnDimension($colLetter)->setWidth(6);
            $colIdx++;
        }

        $totalColLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($colIdx);
        $sheet->setCellValue("{$totalColLetter}2", 'TOTAL (MIN)');
        $sheet->getColumnDimension($totalColLetter)->setWidth(14);

        // Título Principal ajustado al ancho exacto de columnas
        $sheet->mergeCells("A1:{$totalColLetter}1");

        // Estilos Cabecera
        $headerRange = "A2:{$totalColLetter}2";
        $sheet->getStyle($headerRange)->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FFFFFF'));
        $sheet->getStyle($headerRange)->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('334155');
        $sheet->getStyle($headerRange)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(2)->setRowHeight(24);

        $sheet->getColumnDimension('A')->setWidth(5);
        $sheet->getColumnDimension('B')->setWidth(12);
        $sheet->getColumnDimension('C')->setWidth(34);
        $sheet->getColumnDimension('D')->setWidth(24);

        $row = 3;
        $numEmpleado = 1;

        foreach ($areas as $area) {
            if ($area->empleados->isEmpty()) {
                continue;
            }

            // Fila de Cabecera de Área
            $sheet->setCellValue("A{$row}", "ÁREA: " . $area->nombre);
            $sheet->mergeCells("A{$row}:{$totalColLetter}{$row}");
            $sheet->getStyle("A{$row}:{$totalColLetter}{$row}")->getFont()->setBold(true)->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('1E293B'));
            $sheet->getStyle("A{$row}:{$totalColLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('E2E8F0');
            $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT)->setIndent(1);
            $sheet->getRowDimension($row)->setRowHeight(20);
            $row++;

            foreach ($area->empleados as $emp) {
                $registrosMap = $emp->registros->keyBy(function ($r) {
                    return (int) Carbon::parse($r->fecha)->day;
                });

                $sheet->setCellValue("A{$row}", $numEmpleado++);
                $sheet->setCellValueExplicit("B{$row}", $emp->dni, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                $sheet->setCellValue("C{$row}", $emp->nombres);
                $sheet->setCellValue("D{$row}", $emp->cargo ?? '-');

                $sheet->getStyle("A{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle("B{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                $dayColIdx = 5; // Columna E
                $sumTotalMinutos = 0;

                for ($d = 1; $d <= $totalDias; $d++) {
                    $cLetter = \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($dayColIdx);
                    $reg = $registrosMap->get($d);

                    if ($reg && $reg->es_descanso) {
                        $sheet->setCellValue("{$cLetter}{$row}", "D");
                        $sheet->getStyle("{$cLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('F1F5F9');
                        $sheet->getStyle("{$cLetter}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    } elseif ($reg && $reg->minutos_extra !== null) {
                        $val = $reg->minutos_extra;
                        $sheet->setCellValue("{$cLetter}{$row}", $val);
                        $sheet->getStyle("{$cLetter}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                        $sumTotalMinutos += $val;

                        // Coloreado condicional
                        if ($val > 0) {
                            $sheet->getStyle("{$cLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('DCFCE7'); // Verde suave
                            $sheet->getStyle("{$cLetter}{$row}")->getFont()->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('166534'));
                        } elseif ($val < 0) {
                            $sheet->getStyle("{$cLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FEE2E2'); // Rojo suave
                            $sheet->getStyle("{$cLetter}{$row}")->getFont()->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('991B1B'));
                        }
                    } else {
                        $sheet->setCellValue("{$cLetter}{$row}", "");
                    }

                    $dayColIdx++;
                }

                // Columna Total
                $sheet->setCellValue("{$totalColLetter}{$row}", $sumTotalMinutos);
                $sheet->getStyle("{$totalColLetter}{$row}")->getFont()->setBold(true);
                $sheet->getStyle("{$totalColLetter}{$row}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                if ($sumTotalMinutos > 0) {
                    $sheet->getStyle("{$totalColLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('BBF7D0');
                    $sheet->getStyle("{$totalColLetter}{$row}")->getFont()->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('14532D'));
                } elseif ($sumTotalMinutos < 0) {
                    $sheet->getStyle("{$totalColLetter}{$row}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FECACA');
                    $sheet->getStyle("{$totalColLetter}{$row}")->getFont()->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('7F1D1D'));
                }

                $sheet->getRowDimension($row)->setRowHeight(18);
                $row++;
            }
        }

        // Bordes a toda la tabla
        $allTableRange = "A2:{$totalColLetter}" . ($row - 1);
        $sheet->getStyle($allTableRange)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setARGB('CBD5E1');

        $fileName = "EXTRAS_{$mesNombre}_{$anio}_MINUTOS.xlsx";

        return new StreamedResponse(function () use ($spreadsheet) {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
        }, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
