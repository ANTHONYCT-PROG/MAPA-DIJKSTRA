
import os
import folium
import osmnx as ox
import networkx as nx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# --- CONFIGURACIÓN ---
PLACE_NAME = "Puno, Peru"
GRAPH_FILENAME = f"{PLACE_NAME.replace(', ', '_')}.graphml"

# --- INICIALIZACIÓN DE LA APP ---
app = FastAPI()

# --- CARGA Y CACHÉ DEL GRAFO ---
if os.path.exists(GRAPH_FILENAME):
    print(f"Cargando grafo desde archivo local: {GRAPH_FILENAME}")
    G = ox.load_graphml(GRAPH_FILENAME)
else:
    print(f"Descargando datos del mapa para {PLACE_NAME}...")
    G = ox.graph_from_place(PLACE_NAME, network_type='drive')
    ox.save_graphml(G, GRAPH_FILENAME)
    print("Mapa guardado localmente.")

G_proj = ox.project_graph(G)
nodes_proj = ox.graph_to_gdfs(G_proj, edges=False)

# --- ENDPOINTS DE LA API ---

@app.get("/api/map")
async def get_map_config():
    """Devuelve la configuración inicial del mapa."""
    map_center = [nodes_proj.unary_union.centroid.y, nodes_proj.unary_union.centroid.x]
    return {"mapCenter": map_center, "placeName": PLACE_NAME}

@app.get("/api/route")
async def get_route(start_lat: float, start_lon: float, end_lat: float, end_lon: float):
    """Calcula la ruta más corta entre dos puntos."""
    try:
        start_node = ox.nearest_nodes(G, X=start_lon, Y=start_lat)
        end_node = ox.nearest_nodes(G, X=end_lon, Y=end_lat)

        route = nx.dijkstra_path(G, start_node, end_node, weight='length')
        
        route_coords = [[G.nodes[node]['y'], G.nodes[node]['x']] for node in route]

        return {"route": route_coords}

    except nx.NetworkXNoPath:
        raise HTTPException(status_code=404, detail="No se pudo encontrar una ruta.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- SERVIR ARCHIVOS ESTÁTICOS ---
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def read_index():
    """Sirve el archivo HTML principal."""
    return FileResponse('static/index.html')

