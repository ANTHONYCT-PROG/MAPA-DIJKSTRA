
document.addEventListener('DOMContentLoaded', () => {
    const mapElement = document.getElementById('map');
    const placeNameElement = document.getElementById('place-name');
    const statusElement = document.getElementById('status');
    const resetButton = document.getElementById('reset-btn');

    let map;
    let startMarker, endMarker;
    let routeLayer;

    // --- INICIALIZACIÓN DEL MAPA ---
    function initMap(config) {
        placeNameElement.textContent = `Simulador - ${config.placeName}`;
        map = L.map(mapElement).setView(config.mapCenter, 13);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        map.on('click', onMapClick);
        resetButton.addEventListener('click', resetState);
    }

    // --- MANEJO DE EVENTOS ---
    function onMapClick(e) {
        if (!startMarker) {
            startMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
            startMarker.bindPopup("<b>Punto de Inicio</b>").openPopup();
            updateStatus('Punto de inicio seleccionado. Elige el destino.');
        } else if (!endMarker) {
            endMarker = L.marker(e.latlng, { draggable: true }).addTo(map);
            endMarker.bindPopup("<b>Punto de Destino</b>").openPopup();
            updateStatus('Calculando ruta...');
            getRoute();
        }
    }

    // --- LÓGICA DE RUTA ---
    async function getRoute() {
        const start = startMarker.getLatLng();
        const end = endMarker.getLatLng();

        const url = `/api/route?start_lat=${start.lat}&start_lon=${start.lng}&end_lat=${end.lat}&end_lon=${end.lng}`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al calcular la ruta.');
            }
            const data = await response.json();
            drawRoute(data.route);
            updateStatus('¡Ruta encontrada!');
        } catch (error) {
            console.error('Error:', error);
            updateStatus(`Error: ${error.message}`);
        }
    }

    function drawRoute(routeCoords) {
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        routeLayer = L.polyline(routeCoords, { color: 'blue', weight: 5 }).addTo(map);
        map.fitBounds(routeLayer.getBounds());
    }

    // --- FUNCIONES DE UTILIDAD ---
    function resetState() {
        if (startMarker) map.removeLayer(startMarker);
        if (endMarker) map.removeLayer(endMarker);
        if (routeLayer) map.removeLayer(routeLayer);

        startMarker = null;
        endMarker = null;
        routeLayer = null;

        updateStatus('Selecciona un punto de inicio.');
    }

    function updateStatus(message) {
        statusElement.textContent = message;
    }

    // --- INICIO DE LA APLICACIÓN ---
    async function main() {
        try {
            const response = await fetch('/api/map');
            const config = await response.json();
            initMap(config);
            resetState(); // Estado inicial limpio
        } catch (error) {
            console.error("No se pudo inicializar la aplicación:", error);
            statusElement.textContent = "Error: No se pudo conectar con el servidor.";
        }
    }

    main();
});
