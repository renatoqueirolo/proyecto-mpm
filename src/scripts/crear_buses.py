from ortools.sat.python import cp_model
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from collections import Counter
import psycopg2
import os
from dotenv import load_dotenv
from uuid import uuid4
from sqlalchemy import create_engine
import json
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("--turnoId", required=True, help="ID del turno a procesar")
args = parser.parse_args()
turno_id = args.turnoId

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DB_URL)
cursor = conn.cursor()
engine = create_engine(DB_URL)

print("Cargando datos desde la base de datos...")

df_tt = pd.read_sql(f'''
    SELECT TT.*, T."nombreCompleto"
    FROM "TrabajadorTurno" TT
    JOIN "Trabajador" T ON TT."trabajadorId" = T.id
    WHERE TT."turnoId" = '{turno_id}'
''', engine)

if df_tt.empty:
    print(f"No hay trabajadores para el turno {turno_id}")
    exit()

# Capacidades por región (puedes modificar según demanda real)
query = f'''
SELECT region, capacidad
FROM "CapacidadTurno"
WHERE "turnoId" = '{turno_id}'
'''

df = pd.read_sql(query, engine)

capacidades_por_region = {}
for region, group in df.groupby('region'):
    capacidades_por_region[region] = group['capacidad'].tolist()

comuna_a_region = {
    "VIÑA DEL MAR": "V",
    "SAN ANTONIO": "IV",
    "LA CALERA": "V",
    "SANTIAGO": "RM",
    "LOS ANDES": "V",
    # Agrega más comunas según tu caso
}

THRESHOLD_DISTANCE = 40

def obtener_distancia(comuna1, comuna2):
    distancias = {
        ("LA CALERA", "VIÑA DEL MAR"): 15,
        ("LA CALERA", "SAN ANTONIO"): 50,
        ("VIÑA DEL MAR", "SAN ANTONIO"): 35,
    }
    if comuna1 == comuna2:
        return 0
    return distancias.get((comuna1, comuna2)) or distancias.get((comuna2, comuna1)) or 1000

def asignar_buses_por_comuna(df_filtrado, nombre="SUBIDA"):
    from collections import defaultdict

    df_filtrado = df_filtrado.copy()
    df_filtrado['region'] = df_filtrado['acercamiento'].map(comuna_a_region)

    trabajadores_por_comuna = df_filtrado['acercamiento'].value_counts().to_dict()

    comunas_por_region = defaultdict(list)
    for comuna in trabajadores_por_comuna:
        region = comuna_a_region.get(comuna)
        if region:
            comunas_por_region[region].append(comuna)

    bus_info = []
    bus_counter = 1
    remanentes = {}

    for comuna, cantidad in trabajadores_por_comuna.items():
        region = comuna_a_region.get(comuna)
        if not region:
            continue

        capacidades = sorted(capacidades_por_region.get(region, []), reverse=True)

        for cap in capacidades:
            while cantidad >= cap:
                bus_info.append({
                    "id": f"{nombre.lower()}_bus{turno_id}_{bus_counter}",
                    "region": region,
                    "capacidad": cap,
                    "comunas": [comuna],
                    "subida": nombre == "SUBIDA"
                })
                bus_counter += 1
                cantidad -= cap

        if cantidad > 0:
            remanentes[comuna] = {"region": region, "cantidad": cantidad}

    # 2. Asignar buses combinados para remanentes
    capacidades_por_region_sorted = {r: sorted(caps) for r, caps in capacidades_por_region.items()}

    while remanentes:
        # Tomamos una comuna remanente cualquiera para base
        base_comuna = next(iter(remanentes))
        base_region = remanentes[base_comuna]["region"]
        base_cant = remanentes[base_comuna]["cantidad"]

        capacidades = capacidades_por_region_sorted.get(base_region, [])

        # Buscamos comunas cercanas para agrupar
        grupo = [(base_comuna, base_cant)]
        comunas_a_quitar = [base_comuna]

        for otra_comuna, datos in remanentes.items():
            if otra_comuna == base_comuna:
                continue
            if datos["region"] == base_region:
                if obtener_distancia(base_comuna, otra_comuna) <= THRESHOLD_DISTANCE:
                    grupo.append((otra_comuna, datos["cantidad"]))
                    comunas_a_quitar.append(otra_comuna)

        total_personas = sum(cant for _, cant in grupo)

        # Seleccionamos la capacidad de bus que mejor se ajuste (capacidad >= total_personas o la máxima disponible)
        cap_seleccionada = None
        for cap in capacidades:
            if cap >= total_personas:
                cap_seleccionada = cap
                break
        if not cap_seleccionada:
            cap_seleccionada = capacidades[-1]  # la menor capacidad si ninguna alcanza total

        # Ahora asignamos personas a este bus respetando cap_seleccionada
        restante_bus = cap_seleccionada
        comunas_en_bus = []
        for i, (comuna_g, cant_g) in enumerate(grupo):
            if cant_g == 0 or restante_bus == 0:
                continue
            a_asignar = min(cant_g, restante_bus)
            comunas_en_bus.append(comuna_g)
            grupo[i] = (comuna_g, cant_g - a_asignar)
            restante_bus -= a_asignar

        # Actualizamos remanentes según lo asignado
        for comuna_g, cant_rest in grupo:
            if cant_rest == 0 and comuna_g in remanentes:
                del remanentes[comuna_g]
            else:
                remanentes[comuna_g]["cantidad"] = cant_rest

        bus_info.append({
            "id": f"{nombre.lower()}_bus{turno_id}_{bus_counter}",
            "region": base_region,
            "capacidad": cap_seleccionada,
            "comunas": list(set(comunas_en_bus)),
            "subida": nombre == "SUBIDA"
        })
        bus_counter += 1

    return bus_info



# Excluir comuna no deseada en buses
df_subida = df_tt[(df_tt["subida"] == True) & (df_tt["acercamiento"].str.upper() != "AEROPUERTO SANTIAGO")]
df_bajada = df_tt[(df_tt["subida"] == False) & (df_tt["acercamiento"].str.upper() != "AEROPUERTO SANTIAGO")]

buses_subida = asignar_buses_por_comuna(df_subida, "SUBIDA")
buses_bajada = asignar_buses_por_comuna(df_bajada, "BAJADA")


todos_los_buses = buses_subida + buses_bajada

HB_b = {
    bus["id"]: 870 if bus["subida"] else 2000
    for bus in todos_los_buses
}

# Obtener la fecha real del turno desde la tabla "Turno"
cursor.execute('SELECT "fecha" FROM "Turno" WHERE "id" = %s', (turno_id,))
row = cursor.fetchone()

if not row:
    print(f"No se encontró el turno con ID {turno_id}")
    exit()

fecha_turno = row[0]  # Este es un datetime.date o datetime.datetime

for bus in todos_los_buses:
    print(bus)
    bus_id = bus["id"]
    capacidad = bus["capacidad"]
    subida = bus["subida"]
    comunas_origen = bus["comunas"] if subida else ["SANTIAGO"]
    comunas_destino = ["SANTIAGO"] if subida else bus["comunas"]

    hora_base = HB_b[bus_id]
    hora_salida = datetime.combine(fecha_turno.date(), datetime.min.time()) + timedelta(minutes=hora_base)
    hora_llegada = hora_salida + timedelta(minutes=60)

    cursor.execute('SELECT COUNT(*) FROM "BusTurno" WHERE "id" = %s', (bus_id,))
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO "BusTurno" (
                id, "turnoId", "capacidad", "horario_salida", "horario_llegada", 
                "comunas_origen", "comunas_destino"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (
            bus_id,
            turno_id,
            capacidad,
            hora_salida,
            hora_llegada,
            json.dumps(comunas_origen),
            json.dumps(comunas_destino)
        ))

conn.commit()
print(f"Buses creados exitosamente para el turno {turno_id}.")