from ortools.sat.python import cp_model
import pandas as pd
import numpy as np
import json
import psycopg2
import os
import argparse
from dotenv import load_dotenv
from uuid import uuid4
from datetime import datetime, timedelta
from sqlalchemy import create_engine
import unicodedata
import time
import psutil
from zoneinfo import ZoneInfo
from datetime import datetime, timezone

process = psutil.Process(os.getpid())
mem_inicial = process.memory_info().rss / (1024 * 1024)  # en MB
print("----------------------------------------------------------------------------------")
print(f"🔍 Memoria inicial usada por el proceso: {mem_inicial:.2f} MB")

start_time = time.time()

def datetime_to_minutos(horario_dt: datetime, fecha_base: datetime):
    minutos = horario_dt.hour * 60 + horario_dt.minute
    if horario_dt.date() > fecha_base.date():
        minutos += 24 * 60  # sumar 24h si el vuelo es del día siguiente
    return minutos

def datetime_to_minutos_utc(horario_dt: datetime, fecha_base: datetime) -> int:
    # Convertir ambos a hora local (Chile)
    if horario_dt.tzinfo is None:
        horario_dt = horario_dt.replace(tzinfo=timezone.utc)
    horario_local = horario_dt.astimezone(ZoneInfo("America/Santiago"))
    minutos = horario_local.hour * 60 + horario_local.minute
    if horario_local.date() > fecha_base.date():
        minutos += 24 * 60  # sumar 24h si es del día siguiente
    return minutos

def normalizar(texto):
    if not isinstance(texto, str):
        return ''
    return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('utf-8').strip().upper()

romanos_a_enteros = {
    "I": 1, "II": 2, "III": 3, "IV": 4, "V": 5, "VI": 6, "VII": 7, "VIII": 8,
    "IX": 9, "X": 10, "XI": 11, "XII": 12, "XIV": 14, "XV": 15,
    "RM": 13
}

# Cargar variables
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DB_URL)
cursor = conn.cursor()
engine = create_engine(DB_URL)

# Turno actual
parser = argparse.ArgumentParser()
parser.add_argument("--turnoId", required=True, help="ID del turno")
args = parser.parse_args()
turno_id = args.turnoId

# -------------------------
# Cargar datos desde la DB
# -------------------------
df_trabajadores = pd.read_sql(f'''
    SELECT TT.id AS trabajador_id, TT.subida, TT.origen, TT.destino, TT.acercamiento, TT.region, T.rut
    FROM "TrabajadorTurno" TT
    JOIN "Trabajador" T ON TT."trabajadorId" = T.id
    WHERE TT."turnoId" = '{turno_id}';
''', engine)

df_trabajadores_con_avion = pd.read_sql(f'''
    SELECT TT.id AS trabajador_id, TT.subida, TT.origen, TT.destino, TT.acercamiento, TT.region, T.rut
    FROM "AssignmentPlane" AP
    JOIN "TrabajadorTurno" TT ON AP."trabajadorTurnoId" = TT.id
    JOIN "Trabajador" T ON TT."trabajadorId" = T.id
    WHERE TT."turnoId" = '{turno_id}';
''', engine)

if len(df_trabajadores_con_avion)>0:
    print(f"\nTrabajadores con asignación manual: {df_trabajadores_con_avion}")
else:
    print(f"\nTrabajadores con asignación manual: 0")

df_buses = pd.read_sql(f'''
    SELECT *
    FROM "BusTurno"
    WHERE "turnoId" = '{turno_id}';
''', engine)

df_planes = pd.read_sql(f'''
    SELECT 
        PT.id AS plane_turno_id,
        PT."turnoId",
        PT."planeId",
        PT."horario_salida",
        PT."horario_llegada",
        P."ciudad_origen",
        P."ciudad_destino",
        PT."capacidad"
    FROM "PlaneTurno" PT
    JOIN "Plane" P ON PT."planeId" = P."id"
    WHERE PT."turnoId" = '{turno_id}';
''', engine)

df_capacidad_usada_aviones = pd.read_sql(f'''
    SELECT 
        AP."planeTurnoId",
        COUNT(*) AS capacidad_usada
    FROM "AssignmentPlane" AP
    JOIN "TrabajadorTurno" TT ON AP."trabajadorTurnoId" = TT.id
    WHERE TT."turnoId" = '{turno_id}'
    GROUP BY AP."planeTurnoId";
''', engine)

#vuelos comerciales
df_commercial_planes = pd.read_sql(f'''
    SELECT
      "id",
      "airline",
      "flightCode",
      "origin",
      "destination",
      "departureDate",
      "departureTime",
      "arrivalTime",
      "durationMinutes",
      "priceClp",
      "direct",
      "stops",
      "stopsDetail",
      "seatsAvailable"
    FROM "CommercialPlane"
    WHERE "turnoId" = '{turno_id}'
    ORDER BY "departureTime" ASC;
''', engine)

#Parametros modificables
cursor.execute(
    '''
    SELECT  t."fecha",
            p."min_hora",
            p."max_hora",
            p."espera_conexion_subida",
            p."espera_conexion_bajada",
            p."max_tiempo_ejecucion",
            p."tiempo_adicional_parada"
    FROM    "Turno"                AS t
    JOIN    "ParametrosModeloTurno" AS p
           ON p."turnoId" = t."id"
    WHERE   t."id" = %s
    ''',
    (turno_id,)
)

df_regiones = pd.read_sql('SELECT * FROM "Region"', engine)
region_por_id = df_buses.set_index("id")["region"].to_dict()
duracion_por_region = dict(zip(df_regiones["name"], df_regiones["tiempo_promedio_bus"]))

row = cursor.fetchone()
if not row:
    print(f"No se encontró el turno con ID {turno_id}")
    exit()

fecha_turno, min_hora, max_hora, espera_conexion_subida, espera_conexion_bajada, max_tiempo_ejecucion, tiempo_adicional_parada = row


# -------------------------
# Preprocesamiento
# -------------------------
df_trabajadores["origen"] = df_trabajadores["origen"].apply(normalizar)
df_trabajadores["destino"] = df_trabajadores["destino"].apply(normalizar)
df_trabajadores["acercamiento"] = df_trabajadores["acercamiento"].apply(normalizar)
df_trabajadores["region"] = df_trabajadores["region"].apply(normalizar)
df_trabajadores["region"] = df_trabajadores["region"].map(romanos_a_enteros)
df_planes["ciudad_origen"] = df_planes["ciudad_origen"].apply(normalizar)
df_planes["ciudad_destino"] = df_planes["ciudad_destino"].apply(normalizar)

#commercialplanes
df_commercial_planes["origin"] = df_commercial_planes["origin"].apply(normalizar)
df_commercial_planes["destination"] = df_commercial_planes["destination"].apply(normalizar)
iata_map = {"SCL": "SANTIAGO","ANF": "ANTOFAGASTA","CJC": "CALAMA"}
# Reemplazar en columnas origin y destination
df_commercial_planes["origin"] = df_commercial_planes["origin"].replace(iata_map)
df_commercial_planes["destination"] = df_commercial_planes["destination"].replace(iata_map)
#buses
df_buses["comunas_origen"] = df_buses["comunas_origen"].apply(lambda x: [normalizar(c) for c in json.loads(x)])
df_buses["comunas_destino"] = df_buses["comunas_destino"].apply(lambda x: [normalizar(c) for c in json.loads(x)])

# use_plane: 0 para regiones 1, 2, 3, 4 y 15; 1 para el resto
df_trabajadores["use_plane"] = df_trabajadores["region"].apply(lambda r: 0 if r in [1, 2, 3, 4, 15] else 1)
# use_bus: 1 para todas excepto RM (13), que es 0
df_trabajadores["use_bus"] = df_trabajadores["region"].apply(lambda r: 0 if r == 13 else 1)

# -------------------------
# Capacidad Disponible
# -------------------------
buses = df_buses["id"].tolist()
vuelos = df_planes["plane_turno_id"].tolist()
usadas_dict = df_capacidad_usada_aviones.set_index("planeTurnoId")["capacidad_usada"].to_dict()
CB = df_buses.set_index("id")["capacidad"].to_dict()

CVtotal = df_planes.set_index("plane_turno_id")["capacidad"].to_dict()
CV = {
    plane_id: CVtotal.get(plane_id, 0) - usadas_dict.get(plane_id, 0)
    for plane_id in CVtotal
}

# --------------------------------------
# Trabajadores sin vuelo charter
# --------------------------------------

# Agrupo la capacidad disponible por (origen, destino)
df_plane_capacity = (
    df_planes
    .assign(capacidad_restante=lambda df: df['plane_turno_id'].map(CV))
    .groupby(['ciudad_origen', 'ciudad_destino'])['capacidad_restante']
    .sum()
    .reset_index(name='capacidad_total')
)

print("Capacidad Vuelos charter origen-destino")
print(df_plane_capacity)

# Para cada grupo origen–destino, elijo:
#    - primero todos los de la Región Metropolitana (13)
#    - luego los otros, hasta agotar la capacidad
df_demand = df_trabajadores[df_trabajadores['use_plane'] == 1]
asignados_por_origen_dest = {}

for _, row in df_plane_capacity.iterrows():
    o = row['ciudad_origen']
    d = row['ciudad_destino']
    cap = int(row['capacidad_total'])
    grupo = df_demand[(df_demand['origen'] == o) &(df_demand['destino'] == d)]
    
    # Si la demanda cabe, asigno todos
    if len(grupo) <= cap:
        asign_ids = grupo['trabajador_id'].tolist()
    else:
        # 3.1) Primero RM (región 13)
        rm = grupo[grupo['region'] == 13]['trabajador_id'].tolist()
        asign_ids = rm[:cap]
        
        # 3.2) Si aún quedan cupos, agrego otros hasta llenar
        faltantes = cap - len(asign_ids)
        if faltantes > 0:
            otros = grupo[~grupo['trabajador_id'].isin(asign_ids)]
            asign_ids += otros['trabajador_id'].tolist()[:faltantes]
    
    asignados_por_origen_dest[(o, d)] = asign_ids

# 1) Obtener el listado de todos los IDs asignados a avión
assigned_ids = [
    trab_id 
    for ids in asignados_por_origen_dest.values() 
    for trab_id in ids
]

# 2) DataFrame de quienes NO tienen vuelo charter
df_trabajadores_vuelos_comerciales = df_trabajadores[
    ~df_trabajadores["trabajador_id"].isin(assigned_ids)
]

# 3) Quitar los que viajaran en vuelos comerciales de df_trabajadores
not_assigned_ids = set(df_trabajadores_vuelos_comerciales["trabajador_id"])
df_trabajadores = df_trabajadores[
    ~df_trabajadores["trabajador_id"].isin(not_assigned_ids)
].reset_index(drop=True)

#Filtrar vuelos comerciales por hora
print("\nCantidad de vuelos comerciales (sin filtrar):", len(df_commercial_planes))
def vuelo_valido(row):
    id = row["id"]
    destino = row["destination"]
    origen = row["origin"]
    hora_salida = datetime_to_minutos(row["departureTime"], fecha_turno)
    hora_llegada = datetime_to_minutos(row["arrivalTime"], fecha_turno)

    es_santiago = destino == "SANTIAGO" or origen == "SANTIAGO"

    if es_santiago:
        if hora_salida < min_hora or hora_salida > max_hora:
            return False
        if hora_llegada < min_hora or hora_llegada > max_hora:
            return False
    return True

# Filtrar DataFrame
df_commercial_planes = df_commercial_planes[df_commercial_planes.apply(vuelo_valido, axis=1)].reset_index(drop=True)
print("Cantidad de vuelos comerciales (filtrados):", len(df_commercial_planes))

prev_C_CP = df_commercial_planes.set_index("id")["seatsAvailable"].to_dict() #capacidad
prev_Precio_CP = df_commercial_planes.set_index("id")["priceClp"].to_dict() #precio

df_commercial_plane_capacity = (
    df_commercial_planes
    .assign(capacidad_restante=lambda df: df['id'].map(prev_C_CP))
    .groupby(['origin', 'destination'])['capacidad_restante']
    .sum()
    .reset_index(name='capacidad_total')
)
print("\nCapacidad vuelos comerciales origen-destino")
print(df_commercial_plane_capacity)

for _, row in df_commercial_plane_capacity.iterrows():
    o, d, capacidad_total = row["origin"], row["destination"], int(row["capacidad_total"])
    demanda = len(df_trabajadores_vuelos_comerciales[
        (df_trabajadores_vuelos_comerciales["origen"] == o) &
        (df_trabajadores_vuelos_comerciales["destino"] == d) &
        (df_trabajadores_vuelos_comerciales["use_plane"] == 1)
    ])

    if capacidad_total > demanda:
        vuelos_trayecto = df_commercial_planes[
            (df_commercial_planes["origin"] == o) &
            (df_commercial_planes["destination"] == d)
        ].copy()

        vuelos_trayecto = vuelos_trayecto.sort_values(by="priceClp")
        vuelos_seleccionados = []
        acumulado = 0

        for _, vuelo in vuelos_trayecto.iterrows():
            if acumulado >= demanda:
                break
            vuelos_seleccionados.append(vuelo["id"])
            acumulado += prev_C_CP[vuelo["id"]]

        df_commercial_planes = df_commercial_planes[
            ~((df_commercial_planes["origin"] == o) &
              (df_commercial_planes["destination"] == d) &
              (~df_commercial_planes["id"].isin(vuelos_seleccionados)))
        ]

vuelos_comerciales = df_commercial_planes["id"].tolist()

C_CP = df_commercial_planes.set_index("id")["seatsAvailable"].to_dict() #capacidad
Precio_CP = df_commercial_planes.set_index("id")["priceClp"].to_dict() #precio
# --------------------------------------
# Trabajadores sin vuelo
# --------------------------------------


df_demand_com = df_trabajadores_vuelos_comerciales[df_trabajadores_vuelos_comerciales['use_plane'] == 1]
comerciales_asignados_por_origen_dest = {}

for _, row in df_commercial_plane_capacity.iterrows():
    o = row['origin']
    d = row['destination']
    cap = int(row['capacidad_total'])
    grupo = df_demand_com[(df_demand_com['origen'] == o) &(df_demand_com['destino'] == d)]
    
    # Si la demanda cabe, asigno todos
    if len(grupo) <= cap:
        asign_ids_com = grupo['trabajador_id'].tolist()
    else:
        # 3.1) Primero RM (región 13)
        rm = grupo[grupo['region'] == 13]['trabajador_id'].tolist()
        asign_ids_com = rm[:cap]
        
        # 3.2) Si aún quedan cupos, agrego otros hasta llenar
        faltantes = cap - len(asign_ids_com)
        if faltantes > 0:
            otros = grupo[~grupo['trabajador_id'].isin(asign_ids_com)]
            asign_ids_com += otros['trabajador_id'].tolist()[:faltantes]
    
    comerciales_asignados_por_origen_dest[(o, d)] = asign_ids_com

# 1) Obtener el listado de todos los IDs asignados a vuelos comerciales
comerciales_assigned_ids = [trab_id 
    for ids in comerciales_asignados_por_origen_dest.values() 
    for trab_id in ids]

# 2) DataFrame de quienes NO tienen transporte (ni chartes ni cpmerciañ)
df_trabajadores_no_asignados = df_trabajadores_vuelos_comerciales[
    ~df_trabajadores_vuelos_comerciales["trabajador_id"].isin(comerciales_assigned_ids)
]

# 3) Quitar los que viajaran en vuelos comerciales de df_trabajadores
not_assigned_ids_2 = set(df_trabajadores_no_asignados["trabajador_id"])
df_trabajadores_vuelos_comerciales = df_trabajadores_vuelos_comerciales[
    ~df_trabajadores_vuelos_comerciales["trabajador_id"].isin(not_assigned_ids_2)
].reset_index(drop=True)

# -------------------------
# Parámetros
# -------------------------
#charter
trabajadores = df_trabajadores["trabajador_id"].tolist()

#trabajadores_con_avion_ids = set(df_trabajadores_con_avion["trabajador_id"])
# Sobrescribimos a 0 para quienes tienen avión asignado
#df_trabajadores.loc[df_trabajadores["trabajador_id"].isin(trabajadores_con_avion_ids), "use_plane"] = 0

comunas_trabajadores = df_trabajadores.set_index("trabajador_id")["acercamiento"].to_dict()
destino_trabajadores = df_trabajadores.set_index("trabajador_id")["destino"].to_dict()
origen_trabajadores = df_trabajadores.set_index("trabajador_id")["origen"].to_dict()
region_trabajadores = df_trabajadores.set_index("trabajador_id")["region"].to_dict()
use_plane_trabajadores = df_trabajadores.set_index("trabajador_id")["use_plane"].to_dict()
use_bus_trabajadores = df_trabajadores.set_index("trabajador_id")["use_bus"].to_dict()

#vuelos comerciales
trabajadores_comerciales = df_trabajadores_vuelos_comerciales["trabajador_id"].tolist()
df_trabajadores_vuelos_comerciales["use_plane"] = df_trabajadores_vuelos_comerciales["region"].apply(lambda r: 0 if r in [1, 2, 3, 4, 15] else 1)
df_trabajadores_vuelos_comerciales["use_bus"] = df_trabajadores_vuelos_comerciales["region"].apply(lambda r: 0 if r == 13 else 1)
comunas_trabajadores_comerciales = df_trabajadores_vuelos_comerciales.set_index("trabajador_id")["acercamiento"].to_dict()
destino_trabajadores_comerciales = df_trabajadores_vuelos_comerciales.set_index("trabajador_id")["destino"].to_dict()
origen_trabajadores_comerciales = df_trabajadores_vuelos_comerciales.set_index("trabajador_id")["origen"].to_dict()
region_trabajadores_comerciales = df_trabajadores_vuelos_comerciales.set_index("trabajador_id")["region"].to_dict()
use_plane_trabajadores_comerciales = df_trabajadores_vuelos_comerciales.set_index("trabajador_id")["use_plane"].to_dict()
use_bus_trabajadores_comerciales = df_trabajadores_vuelos_comerciales.set_index("trabajador_id")["use_bus"].to_dict()

#planeturnos
HV = {row["plane_turno_id"]: datetime_to_minutos(row["horario_salida"], fecha_turno)
    for _, row in df_planes.iterrows()}

HV_bajada = {row["plane_turno_id"]: datetime_to_minutos(row["horario_llegada"], fecha_turno)
    for _, row in df_planes.iterrows()}

#commercialplanes
H_CP = {row["id"]: datetime_to_minutos_utc(row["departureTime"], fecha_turno)
    for _, row in df_commercial_planes.iterrows()}

H_CP_bajada = {row["id"]: datetime_to_minutos_utc(row["arrivalTime"], fecha_turno)
    for _, row in df_commercial_planes.iterrows()}

#buses
comunas_origen_bus = df_buses.set_index("id")["comunas_origen"].apply(lambda x: x if isinstance(x, list) else json.loads(x)).to_dict()
comunas_destino_bus = df_buses.set_index("id")["comunas_destino"].apply(lambda x: x if isinstance(x, list) else json.loads(x)).to_dict()

#planeturno
origen_planes = df_planes.set_index("plane_turno_id")["ciudad_origen"].str.upper().to_dict()
destino_planes = df_planes.set_index("plane_turno_id")["ciudad_destino"].str.upper().to_dict()
#commercialplanes
origen_commercial_planes = df_commercial_planes.set_index("id")["origin"].str.upper().to_dict()
destino_commercial_planes = df_commercial_planes.set_index("id")["destination"].str.upper().to_dict()

print("\nDestino vuelos comerciales:")
print(destino_commercial_planes)

# -------------------------
# Modelo OR-Tools
# -------------------------
model = cp_model.CpModel()

#Restricciones y Variables
x = {}
y = {}
z = {}
HB_var = {}

for t in trabajadores:
    for b in buses:
        x[(t, b)] = model.NewBoolVar(f'x_{t}_{b}')
    for v in vuelos:
        y[(t, v)] = model.NewBoolVar(f'y_{t}_{v}')

for tc in trabajadores_comerciales:
    for b in buses:
        x[(tc, b)] = model.NewBoolVar(f'x_{tc}_{b}')
    for vc in vuelos_comerciales:
        z[(tc, vc)] = model.NewBoolVar(f'z_{tc}_{vc}')

# Restricción: use bus y use vuelo por trabajador según región
for t in trabajadores:
    model.Add(sum(x[(t, b)] for b in buses) == use_bus_trabajadores[t])
    model.Add(sum(y[(t, v)] for v in vuelos) == use_plane_trabajadores[t])

for tc in trabajadores_comerciales:
    model.Add(sum(x[(tc, b)] for b in buses) == use_bus_trabajadores_comerciales[tc])
    model.Add(sum(z[(tc, vc)] for vc in vuelos_comerciales) == use_plane_trabajadores_comerciales[tc])

# Restricción: capacidad buses y vuelos
for b in buses:
    model.Add(sum(x[(t, b)] for t in trabajadores) + sum(x[(tc, b)] for tc in trabajadores_comerciales) <= CB[b])
    HB_var[b] = model.NewIntVar(min_hora, max_hora, f'HB_{b}')
for v in vuelos:
    model.Add(sum(y[(t, v)] for t in trabajadores) <= CV[v])
for vc in vuelos_comerciales:
    model.Add(sum(z[(tc, vc)] for tc in trabajadores_comerciales) <= C_CP[vc])

# Restricción: compatibilidad de horario, origen y destino
for t in trabajadores:
    fila = df_trabajadores[df_trabajadores["trabajador_id"] == t].iloc[0]
    subida = fila["subida"]

    if use_bus_trabajadores[t] ==1:
        for b in buses:
            if subida:
                if normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_origen_bus[b]):
                    model.Add(x[(t, b)] == 0)
            else:
                if normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_destino_bus[b]):
                    model.Add(x[(t, b)] == 0)

    if use_plane_trabajadores[t] ==1:
        for v in vuelos:
            if normalizar(origen_planes[v]) != (normalizar(origen_trabajadores[t])):
                model.Add(y[(t, v)] == 0)
            if normalizar(destino_planes[v]) != (normalizar(destino_trabajadores[t])):
                model.Add(y[(t, v)] == 0)

    # Restricción de conexión temporal
            if use_bus_trabajadores[t] ==1:
                for b in buses:
                    if subida:
                        model.Add(HB_var[b] + espera_conexion_subida <= HV[v]).OnlyEnforceIf([x[(t, b)], y[(t, v)]])
                    else:
                        model.Add(HB_var[b] >= HV_bajada[v] + espera_conexion_bajada).OnlyEnforceIf([x[(t, b)], y[(t, v)]])

for t in trabajadores_comerciales:
    fila = df_trabajadores_vuelos_comerciales[df_trabajadores_vuelos_comerciales["trabajador_id"] == t].iloc[0]
    subida = fila["subida"]

    if use_bus_trabajadores_comerciales[t] ==1:
        for b in buses:
            if subida:
                if normalizar(comunas_trabajadores_comerciales[t]) not in map(str.upper, comunas_origen_bus[b]):
                    model.Add(x[(t, b)] == 0)
            else:
                if normalizar(comunas_trabajadores_comerciales[t]) not in map(str.upper, comunas_destino_bus[b]):
                    model.Add(x[(t, b)] == 0)

    if use_plane_trabajadores_comerciales[t] ==1:
        for v in vuelos_comerciales:
            if normalizar(origen_commercial_planes[v]) != (normalizar(origen_trabajadores_comerciales[t])):
                model.Add(z[(t, v)] == 0)
            if normalizar(destino_commercial_planes[v]) != (normalizar(destino_trabajadores_comerciales[t])):
                model.Add(z[(t, v)] == 0)

    # Restricción de conexión temporal
            if use_bus_trabajadores_comerciales[t] ==1:
                for b in buses:
                    if subida:
                        model.Add(HB_var[b] + espera_conexion_subida <= H_CP[v]).OnlyEnforceIf([x[(t, b)], z[(t, v)]])
                    else:
                        model.Add(HB_var[b] >= H_CP_bajada[v] + espera_conexion_bajada).OnlyEnforceIf([x[(t, b)], z[(t, v)]])

# -------------------------
# Logs para depuración
# -------------------------
incompatibles_bus = 0
incompatibles_vuelo = 0

for t in trabajadores:
    subida = df_trabajadores[df_trabajadores["trabajador_id"] == t]["subida"].values[0]

    # Validar compatibilidad solo si el trabajador puede usar bus
    if use_bus_trabajadores[t] == 1:
        buses_validos = (
            [b for b in buses if normalizar(comunas_trabajadores[t]) in comunas_origen_bus[b]]
            if subida else
            [b for b in buses if normalizar(comunas_trabajadores[t]) in comunas_destino_bus[b]]
        )
        if len(buses_validos) == 0:
            print(f"⚠️ Trabajador {t} sin buses compatibles ({'SUBIDA' if subida else 'BAJADA'})")
            incompatibles_bus += 1

    # Validar compatibilidad solo si el trabajador puede usar vuelo
    if use_plane_trabajadores[t] == 1:
        vuelos_validos = [
            v for v in vuelos
            if normalizar(origen_planes[v]) == normalizar(origen_trabajadores[t])
            and normalizar(destino_planes[v]) == normalizar(destino_trabajadores[t])
        ]
        if len(vuelos_validos) == 0:
            print(f"⚠️ Trabajador {t} sin vuelos compatibles")
            incompatibles_vuelo += 1


print(f"\n🚫 Trabajadores sin buses compatibles: {incompatibles_bus}")
print(f"🚫 Trabajadores sin vuelos compatibles: {incompatibles_vuelo}")

# -------------------------
# Función objetivo: minimizar espera
# -------------------------
espera_total = []
comb_vars = {}
for t in trabajadores:
    if use_plane_trabajadores[t] == 1 and use_bus_trabajadores[t] == 1:
        subida = df_trabajadores[df_trabajadores["trabajador_id"] == t]["subida"].values[0]
        for b in buses:
            if subida and normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_origen_bus[b]):
                continue
            if not subida and normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_destino_bus[b]):
                continue

            for v in vuelos:
                if normalizar(origen_planes[v]) != normalizar(origen_trabajadores[t]):
                    continue
                if normalizar(destino_planes[v]) != normalizar(destino_trabajadores[t]):
                    continue
                # Crear la variable de diferencia
                diff_expr = HV[v] - HB_var[b] if subida else HB_var[b] - HV_bajada[v]

                # Crear variable de combinación
                comb = model.NewBoolVar(f'c_{t}_{b}_{v}')
                comb_vars[(t, b, v)] = comb
                model.AddBoolAnd([x[(t, b)], y[(t, v)]]).OnlyEnforceIf(comb)
                model.AddBoolOr([x[(t, b)].Not(), y[(t, v)].Not()]).OnlyEnforceIf(comb.Not())

                # Crear variable de espera condicional
                espera = model.NewIntVar(-1440, 1440, f'espera_{t}_{b}_{v}')
                model.Add(espera == diff_expr).OnlyEnforceIf(comb)
                model.Add(espera == 0).OnlyEnforceIf(comb.Not())

                # Agregar a la función objetivo
                espera_total.append(espera)

for t in trabajadores_comerciales:
    if use_plane_trabajadores_comerciales[t] == 1 and use_bus_trabajadores_comerciales[t] == 1:
        subida = df_trabajadores_vuelos_comerciales[df_trabajadores_vuelos_comerciales["trabajador_id"] == t]["subida"].values[0]
        for b in buses:
            if subida and normalizar(comunas_trabajadores_comerciales[t]) not in map(str.upper, comunas_origen_bus[b]):
                continue
            if not subida and normalizar(comunas_trabajadores_comerciales[t]) not in map(str.upper, comunas_destino_bus[b]):
                continue

            for v in vuelos_comerciales:
                if normalizar(origen_commercial_planes[v]) != normalizar(origen_trabajadores_comerciales[t]):
                    continue
                if normalizar(destino_commercial_planes[v]) != normalizar(destino_trabajadores_comerciales[t]):
                    continue
                # Crear la variable de diferencia
                diff_expr = H_CP[v] - HB_var[b] if subida else HB_var[b] - H_CP_bajada[v]

                # Crear variable de combinación
                comb = model.NewBoolVar(f'c_{t}_{b}_{v}')
                comb_vars[(t, b, v)] = comb
                model.AddBoolAnd([x[(t, b)], z[(t, v)]]).OnlyEnforceIf(comb)
                model.AddBoolOr([x[(t, b)].Not(), z[(t, v)].Not()]).OnlyEnforceIf(comb.Not())

                # Crear variable de espera condicional
                espera = model.NewIntVar(-1440, 1440, f'espera_{t}_{b}_{v}')
                model.Add(espera == diff_expr).OnlyEnforceIf(comb)
                model.Add(espera == 0).OnlyEnforceIf(comb.Not())

                # Agregar a la función objetivo
                espera_total.append(espera)

model.Minimize(sum(espera_total))

# Chequeo: variables que fueron creadas
print(f"\n📦 Variables x creadas: {len(x)}")
print(f"📦 Variables y creadas: {len(y)}")
print(f"📦 Variables z creadas: {len(z)}")
print(f"📦 Variables HB_var creadas: {len(HB_var)}")
print(f"📦 Variables comb creadas: {len(comb_vars)}")
print(f"📦 Variables espera creadas: {len(espera_total)}")

print("🔍 Total trabajadores:", len(trabajadores)+len(trabajadores_comerciales)+len(df_trabajadores_no_asignados))
print("   - Total trabajadores (vuelos charter):", len(trabajadores))
print("   - Total trabajadores (vuelos comerciales):", len(trabajadores_comerciales))
print("   - Total trabajadores (sin vuelos):", len(df_trabajadores_no_asignados))
print("🔍 Total buses:", len(buses))
print("🔍 Total vuelos:", len(vuelos)+len(vuelos_comerciales))
print("   - Total vuelos charter:", len(vuelos))
print("   - Total vuelos comerciales:", len(vuelos_comerciales))
print("🔍 Capacidad total buses:", sum(CB.values()))
print("🔍 Capacidad total vuelos:", sum(CVtotal.values())+sum(C_CP.values()))
print("   - Capacidad vuelos charter:", sum(CVtotal.values()))
print("   - Capacidad vuelos comerciales:", sum(C_CP.values()))

# -------------------------
# Resolver
# -------------------------
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = max_tiempo_ejecucion
# Tiempo límite y estadísticas iniciales
print(f"\n🧠 Tiempo límite de resolución: {solver.parameters.max_time_in_seconds} segundos")
print("📈 Comenzando resolución...")
status = solver.Solve(model)

end_time = time.time()
elapsed_time = end_time - start_time
print(f"⏱ Tiempo total Ejecución: {elapsed_time:.2f} segundos")

if status in [cp_model.FEASIBLE, cp_model.OPTIMAL]:
    print("✅ Solución encontrada. Valor objetivo:", solver.ObjectiveValue())
    trabajadores_no_rm = [t for t in trabajadores if region_trabajadores[t] != 13]
    trabajadores_com_no_rm = [t for t in trabajadores_comerciales if region_trabajadores_comerciales[t] != 13]
    if trabajadores_no_rm or trabajadores_com_no_rm:
        espera_promedio = round(solver.ObjectiveValue() / (len(trabajadores_no_rm)+len(trabajadores_com_no_rm)))
        print("Espera Promedio:", espera_promedio)
    else:
        espera_promedio = 0
        print("No hay trabajadores fuera de la Región Metropolitana (Región 13)")
        print("Espera Promedio:", espera_promedio)

    # Guardar en ParametrosModeloTurno
    cursor.execute(
        '''
        UPDATE "ParametrosModeloTurno"
        SET    "tiempo_promedio_espera" = %s
        WHERE  "turnoId" = %s
        ''',
        (espera_promedio, turno_id)
    )
    conn.commit()

else:
    print("❌ No se encontró solución.")
    exit()

# -------------------------
# Guardar Resultados
# -------------------------

# Insertar asignaciones de bus
for b in buses:
    for t in trabajadores:
        if solver.Value(x[(t, b)]):
            cursor.execute('''
                INSERT INTO "AssignmentBus" (id, "trabajadorTurnoId", "busTurnoId")
                VALUES (%s, %s, %s)
            ''', (str(uuid4()), t, b))
    for t in trabajadores_comerciales:
        if solver.Value(x[(t, b)]):
            cursor.execute('''
                INSERT INTO "AssignmentBus" (id, "trabajadorTurnoId", "busTurnoId")
                VALUES (%s, %s, %s)
            ''', (str(uuid4()), t, b))

# Insertar asignaciones de avión
for t in trabajadores:
    for v in vuelos:
        if solver.Value(y[(t, v)]):
            cursor.execute('''
                INSERT INTO "AssignmentPlane" (id, "trabajadorTurnoId", "planeTurnoId")
                VALUES (%s, %s, %s)
            ''', (str(uuid4()), t, v))

kpi_precio_comerciales=0
for t in trabajadores_comerciales:
    for v in vuelos_comerciales:
        if solver.Value(z[(t, v)]):
            cursor.execute('''
                INSERT INTO "AssignmentCommercialPlane" (id, "trabajadorTurnoId", "commercialPlaneId")
                VALUES (%s, %s, %s)
            ''', (str(uuid4()), t, v))
            kpi_precio_comerciales+=Precio_CP[v]

print(f"Gastos Vuelos Comerciales: {kpi_precio_comerciales} CLP")
# -------------------------
# Actualizar horarios optimizados de buses
# -------------------------

for b in buses:
    region = region_por_id.get(b)
    duracion = duracion_por_region.get(region, 60)
    if len(comunas_origen_bus[b]) > 1:
        duracion += tiempo_adicional_parada*(len(comunas_origen_bus[b])-1)
    
    if "subida" in b.lower():
        horario_llegada_min = solver.Value(HB_var[b])
        horario_llegada = datetime.combine(fecha_turno.date(), datetime.min.time()) + timedelta(minutes=horario_llegada_min)
        horario_salida = horario_llegada - timedelta(minutes=duracion)

    elif "bajada" in b.lower():
        horario_salida_min = solver.Value(HB_var[b])
        horario_salida = datetime.combine(fecha_turno.date(), datetime.min.time()) + timedelta(minutes=horario_salida_min)
        horario_llegada = horario_salida + timedelta(minutes=duracion)

    cursor.execute('''
        UPDATE "BusTurno"
        SET "horario_salida" = %s, "horario_llegada" = %s
        WHERE id = %s
    ''', (
        horario_salida,
        horario_llegada,
        b
    ))

conn.commit()
cursor.close()
conn.close()
print(f"✈️🚌 Asignaciones insertadas exitosamente para el turno {turno_id}")

mem_final = process.memory_info().rss / (1024 * 1024)
print(f"✅ Memoria final usada por el proceso: {mem_final:.2f} MB")
print(f"📈 Diferencia de memoria: {mem_final - mem_inicial:.2f} MB")
print("----------------------------------------------------------------------------------")