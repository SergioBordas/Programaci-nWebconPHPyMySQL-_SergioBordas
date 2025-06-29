$(document).ready(function() {
    let rangoPrecioSliderInstance = null;

    // Inicializar el ionRangeSlider con valores por defecto.
    // Esto es vital para que rangoPrecioSliderInstance se inicialice ANTES de ser usado.
    $("#rangoPrecio").ionRangeSlider({
        type: "double",
        grid: true,
        min: 0,
        max: 100000,
        from: 0,
        to: 100000,
        prefix: "$",
        onStart: function (data) {
            rangoPrecioSliderInstance = data.slider;
            $('#rangoPrecioTexto').text(`$${data.from.toLocaleString()} - $${data.to.toLocaleString()}`);
        },
        onChange: function (data) {
            $('#rangoPrecioTexto').text(`$${data.from.toLocaleString()} - $${data.to.toLocaleString()}`);
        }
    });
    $('#rangoPrecioTexto').text(`$${0} - $${100000}`);


    // Función para cargar los filtros (ciudades, tipos, rango de precios) desde PHP
    function getFilters() {
        $.ajax({
            url: 'buscar.php?action=getFiltersAndPriceRange',
            type: 'GET',
            dataType: 'json',
            success: function(response) {
                console.log("Respuesta de getFiltersAndPriceRange:", response);

                if (response.error) {
                    console.error("Error al obtener filtros:", response.error);
                    // Mostrar un mensaje de error en los selects si algo falla
                    $('#ciudad').html('<option value="" disabled selected>Error al cargar ciudades</option>');
                    $('#tipo').html('<option value="" disabled selected>Error al cargar tipos</option>');
                    $('select').formSelect(); // Intenta inicializar incluso con error para mostrar el mensaje
                    return;
                }

                // Poblar el select de Ciudades
                const ciudadSelect = $('#ciudad');
                ciudadSelect.empty();
                ciudadSelect.append('<option value="" disabled selected>Elige una Ciudad</option>');
                response.ciudades.forEach(function(ciudad) {
                    ciudadSelect.append(`<option value="${ciudad}">${ciudad}</option>`);
                });
                
                // Poblar el select de Tipos
                const tipoSelect = $('#tipo');
                tipoSelect.empty();
                tipoSelect.append('<option value="" disabled selected>Elige un Tipo</option>');
                response.tipos.forEach(function(tipo) {
                    tipoSelect.append(`<option value="${tipo}">${tipo}</option>`);
                });

                // Inicializar los selects de Materialize
                try {
                    // Si M.AutoInit() está funcionando desde index.html, esto podría ser redundante
                    // pero es una buena práctica forzar la inicialización después de poblar.
                    $('select').formSelect(); 
                    console.log("Materialize selects inicializados después de poblar.");
                } catch (e) {
                    console.error("Error al inicializar Materialize selects con formSelect():", e);
                    console.warn("Verifica la versión de Materialize y si 'formSelect' está disponible o si M.AutoInit() está en conflicto.");
                    // Fallback visual si la inicialización de Materialize falla
                    $('select').css('display', 'block'); // Hace los selects visibles si Materialize no los estiliza
                    // Opcional: intentar remover elementos extra que Materialize podría haber creado mal
                    $('select').parent().find('input.select-dropdown').remove();
                    $('select').parent().find('ul.dropdown-content').remove();
                }

                // Actualizar el ionRangeSlider con los valores reales de PHP
                // Asegúrate de que minPrice y maxPrice siempre sean números
                const minPrice = parseFloat(response.minPrice) || 0;
                const maxPrice = parseFloat(response.maxPrice) || 100000;
                
                if (rangoPrecioSliderInstance) {
                    rangoPrecioSliderInstance.update({
                        min: minPrice,
                        max: maxPrice,
                        from: minPrice,
                        to: maxPrice
                    });
                    $('#rangoPrecioTexto').text(`$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}`);
                } else {
                    console.error("ionRangeSliderInstance no está disponible para ser actualizado por getFilters().");
                }
            },
            error: function(xhr, status, error) {
                console.error("Error en la petición AJAX para filtros:", status, error);
                console.error("Respuesta del servidor:", xhr.responseText);
                $('#ciudad').html('<option value="" disabled selected>Error al cargar ciudades</option>');
                $('#tipo').html('<option value="" disabled selected>Error al cargar tipos</option>');
                // Forzar visibilidad si el error impide que Materialize los estilice
                $('select').css('display', 'block'); 
            }
        });
    }

    // Cargar todas las propiedades
    function loadAllResults() {
        console.log("Cargando todas las propiedades...");
        $.ajax({
            url: 'buscar.php?action=showAll',
            type: 'GET',
            dataType: 'json',
            success: function(data) {
                console.log("Propiedades cargadas:", data);
                displayResults(data);
            },
            error: function(xhr, status, error) {
                console.error("Error al cargar todas las propiedades:", status, error);
                console.error("Respuesta del servidor:", xhr.responseText);
                $('.resultadosBusqueda').empty().append('<p>Error al cargar las propiedades.</p>');
            }
        });
    }

    // Buscar propiedades por filtros
    function searchProperties() {
        const ciudad = $('#ciudad').val();
        const tipo = $('#tipo').val();
        let precioMin = 0;
        let precioMax = 0;

        if (rangoPrecioSliderInstance && rangoPrecioSliderInstance.result) {
            const rangeData = rangoPrecioSliderInstance.result;
            precioMin = rangeData.from;
            precioMax = rangeData.to;
            console.log(`Buscando: Ciudad=${ciudad}, Tipo=${tipo}, Precio=${precioMin}-${precioMax}`);
        } else {
            console.warn("Slider de precio no inicializado o sin resultados válidos. Usando valores por defecto.");
            precioMin = 0;
            precioMax = 100000;
        }

        $.ajax({
            url: 'buscar.php?action=search',
            type: 'GET',
            dataType: 'json',
            data: {
                ciudad: ciudad,
                tipo: tipo,
                precioMin: precioMin,
                precioMax: precioMax
            },
            success: function(data) {
                console.log("Resultados de la búsqueda:", data);
                displayResults(data);
            },
            error: function(xhr, status, error) {
                console.error("Error en la búsqueda:", status, error);
                console.error("Respuesta del servidor:", xhr.responseText);
                $('.resultadosBusqueda').empty().append('<p>Error en la búsqueda.</p>');
            }
        });
    }

    // Mostrar resultados en el contenedor
    function displayResults(properties) {
        const resultsContainer = $('.resultadosBusqueda');
        resultsContainer.empty();

        if (properties && properties.length > 0) {
            properties.forEach(function(propiedad) {
                const card = `
                    <div class="card horizontal itemMostrado">
                        <div class="card-image">
                            <img src="img/home.jpg" alt="Imagen propiedad">
                        </div>
                        <div class="card-stacked">
                            <div class="card-content">
                                <p><strong>Id:</strong> ${propiedad.Id || 'N/A'}</p>
                                <p><strong>Dirección:</strong> ${propiedad.Direccion || 'N/A'}</p>
                                <p><strong>Ciudad:</strong> ${propiedad.Ciudad || 'N/A'}</p>
                                <p><strong>Tipo:</strong> ${propiedad.Tipo || 'N/A'}</p>
                                <p class="precioTexto"><strong>Precio:</strong> ${propiedad.Precio || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                `;
                resultsContainer.append(card);
            });
        } else {
            resultsContainer.append('<p>No se encontraron propiedades con los criterios de búsqueda.</p>');
        }
    }

    // Event Listeners
    $('#buscar').click(searchProperties);
    $('#mostrarTodos').click(loadAllResults);

    // Cargar filtros al inicio
    getFilters();
    $('.resultadosBusqueda').empty().append('<p>Utiliza los filtros o haz clic en "Mostrar Todos" para ver propiedades.</p>');
});