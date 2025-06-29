<?php
header('Content-Type: application/json');

// Desactivar la visualización de errores para evitar que interfieran con la salida JSON.
// Es importante para producción. Durante desarrollo, puedes activarlo temporalmente.
ini_set('display_errors', 0); 
ini_set('display_startup_errors', 0);
error_reporting(E_ALL); // Reporta todos los errores, pero no los muestra si display_errors está en 0.

// Limpiar cualquier posible salida de buffer que no sea JSON
ob_clean();

$action = $_GET['action'] ?? '';

// Ruta al archivo JSON de datos
$dataPath = __DIR__ . '/data-1.json';

// Cargar los datos del archivo JSON
$properties = []; // Inicializar como array vacío por defecto
if (file_exists($dataPath)) {
    $jsonData = file_get_contents($dataPath);
    // Verificar si el JSON es válido antes de decodificar
    if ($jsonData === false) {
        echo json_encode(['error' => 'No se pudo leer el archivo data-1.json.']);
        exit();
    }
    $properties = json_decode($jsonData, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['error' => 'Error al decodificar JSON: ' . json_last_error_msg() . ' en ' . basename($dataPath)]);
        exit();
    }
    // Asegurarse de que $properties es un array, incluso si el JSON estaba vacío
    if (!is_array($properties)) {
        $properties = [];
    }
} else {
    echo json_encode(['error' => 'El archivo data-1.json no se encontró en: ' . $dataPath]);
    exit();
}

switch ($action) {
    case 'getFiltersAndPriceRange':
        $cities = [];
        $types = [];
        $prices = [];

        foreach ($properties as $prop) {
            // Asegurarse de que las claves existan y no estén vacías
            if (isset($prop['Ciudad']) && is_string($prop['Ciudad']) && !empty(trim($prop['Ciudad']))) {
                $cities[] = trim($prop['Ciudad']);
            }
            if (isset($prop['Tipo']) && is_string($prop['Tipo']) && !empty(trim($prop['Tipo']))) {
                $types[] = trim($prop['Tipo']);
            }
            // Limpiar y convertir el precio de forma robusta
            if (isset($prop['Precio']) && is_string($prop['Precio'])) {
                // Eliminar símbolos de moneda, comas y espacios, y reemplazar coma decimal por punto si es necesario
                $cleanedPrice = str_replace(['$', ',', ' '], '', $prop['Precio']);
                // Convertir a float solo si es numérico
                if (is_numeric($cleanedPrice)) {
                    $prices[] = (float)$cleanedPrice;
                }
            }
        }

        // Obtener valores únicos y ordenar. Asegurarse de que son arrays antes de ordenar.
        $uniqueCities = array_values(array_unique($cities));
        if (!empty($uniqueCities)) { 
            sort($uniqueCities); //
        }
        
        $uniqueTypes = array_values(array_unique($types));
        if (!empty($uniqueTypes)) {
            sort($uniqueTypes); //
        }

        // Determinar min y max precio. Si no hay precios, usar valores por defecto.
        $minPrice = !empty($prices) ? floor(min($prices)) : 0;
        $maxPrice = !empty($prices) ? ceil(max($prices)) : 100000;

        echo json_encode([
            'ciudades' => $uniqueCities,
            'tipos' => $uniqueTypes,
            'minPrice' => $minPrice,
            'maxPrice' => $maxPrice
        ]);
        break;

    case 'search':
        $ciudad = $_GET['ciudad'] ?? '';
        $tipo = $_GET['tipo'] ?? '';
        $precioMin = (float)($_GET['precioMin'] ?? 0);
        $precioMax = (float)($_GET['precioMax'] ?? 100000);

        $filteredProperties = [];
        foreach ($properties as $prop) {
            $matchCiudad = empty($ciudad) || (isset($prop['Ciudad']) && is_string($prop['Ciudad']) && trim($prop['Ciudad']) === $ciudad);
            $matchTipo = empty($tipo) || (isset($prop['Tipo']) && is_string($prop['Tipo']) && trim($prop['Tipo']) === $tipo);
            
            $propPrice = 0;
            if (isset($prop['Precio']) && is_string($prop['Precio'])) {
                $cleanedPropPrice = str_replace(['$', ',', ' '], '', $prop['Precio']);
                if (is_numeric($cleanedPropPrice)) {
                    $propPrice = (float)$cleanedPropPrice;
                }
            }
            $matchPrecio = ($propPrice >= $precioMin && $propPrice <= $precioMax);

            if ($matchCiudad && $matchTipo && $matchPrecio) {
                $filteredProperties[] = $prop;
            }
        }
        echo json_encode($filteredProperties);
        break;

    case 'showAll':
        echo json_encode($properties);
        break;

    default:
        echo json_encode(['error' => 'Acción no válida.']);
        break;
}
?>