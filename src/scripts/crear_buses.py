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
from collections import defaultdict

parser = argparse.ArgumentParser()
parser.add_argument("--turnoId", required=True, help="ID del turno a procesar")
args = parser.parse_args()
turno_id = args.turnoId

load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DB_URL)
cursor = conn.cursor()
engine = create_engine(DB_URL)
print("----------------------------------------------------------------------------------")
print("Creando buses:")

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

df = pd.read_sql(f'''
    SELECT r.name AS region, ct.capacidad
    FROM "CapacidadTurno" ct
    JOIN "Region" r ON ct."regionId" = r.id
    WHERE ct."turnoId" = '{turno_id}'
''', engine)


capacidades_por_region = {}
for region, group in df.groupby('region'):
    capacidades_por_region[region] = group['capacidad'].tolist()



df_regiones = pd.read_sql('SELECT * FROM "Region"', engine)
comuna_a_region_subida = {}
comuna_a_region_bajada = {}

for _, row in df_regiones.iterrows():
    for comuna in row["comunas_acercamiento_subida"]:
        comuna_a_region_subida[comuna.upper()] = row["name"]
    for comuna in row["comunas_acercamiento_bajada"]:
        comuna_a_region_bajada[comuna.upper()] = row["name"]

def asignar_buses_por_comuna(df_filtrado, nombre="SUBIDA"):
    trabajadores_por_comuna = df_filtrado['acercamiento'].str.upper().value_counts().to_dict()
    bus_info = []
    bus_counter = 1
    remanentes = {}

    es_subida = nombre.upper() == "SUBIDA"
    comuna_a_region = comuna_a_region_subida if es_subida else comuna_a_region_bajada

    for comuna, cantidad in trabajadores_por_comuna.items():
        region = comuna_a_region.get(comuna)
        if not region:
            print(f"⚠️ Comuna '{comuna}' no está registrada en tabla Region para {'subida' if es_subida else 'bajada'}")
            continue

        capacidades = sorted(capacidades_por_region.get(region, []), reverse=True)

        for cap in capacidades:
            while cantidad >= cap:
                bus_info.append({
                    "id": f"{nombre.lower()}_bus{turno_id}_{bus_counter}",
                    "region": region,
                    "capacidad": cap,
                    "comunas": [comuna],
                    "subida": es_subida
                })
                bus_counter += 1
                cantidad -= cap

        if cantidad > 0:
            remanentes[comuna] = {"region": region, "cantidad": cantidad}

    # Agrupar remanentes en buses de máximo 2 paradas
    capacidades_por_region_sorted = {r: sorted(caps) for r, caps in capacidades_por_region.items()}

    while remanentes:
        base_comuna = next(iter(remanentes))
        base_region = remanentes[base_comuna]["region"]
        capacidades = capacidades_por_region_sorted.get(base_region, [])
        if not capacidades:
            print(f"⚠️ No hay capacidades definidas para región {base_region}")
            break

        grupo = [(base_comuna, remanentes[base_comuna]["cantidad"])]
        del remanentes[base_comuna]

        # Buscar segunda comuna del mismo región si hay
        segunda_comuna = None
        for otra_comuna, datos in remanentes.items():
            if datos["region"] == base_region:
                segunda_comuna = otra_comuna
                grupo.append((segunda_comuna, datos["cantidad"]))
                break

        if segunda_comuna:
            del remanentes[segunda_comuna]

        total_personas = sum(c for _, c in grupo)
        cap_seleccionada = next((cap for cap in capacidades if cap >= total_personas), capacidades[-1])
        restante_bus = cap_seleccionada
        comunas_en_bus = []

        for i, (comuna_g, cant_g) in enumerate(grupo):
            a_asignar = min(cant_g, restante_bus)
            comunas_en_bus.append(comuna_g)
            grupo[i] = (comuna_g, cant_g - a_asignar)
            restante_bus -= a_asignar

        # Volver a guardar remanentes que no se asignaron
        for comuna_g, cant_rest in grupo:
            if cant_rest > 0:
                remanentes[comuna_g] = {"region": base_region, "cantidad": cant_rest}

        bus_info.append({
            "id": f"{nombre.lower()}_bus{turno_id}_{bus_counter}",
            "region": base_region,
            "capacidad": cap_seleccionada,
            "comunas": list(set(comunas_en_bus)),
            "subida": es_subida
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
    region = bus["region"]
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
                "region","comunas_origen", "comunas_destino"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ''', (
            bus_id,
            turno_id,
            capacidad,
            hora_salida,
            hora_llegada,
            region,
            json.dumps(comunas_origen),
            json.dumps(comunas_destino)
        ))

conn.commit()
print("----------------------------------------------------------------------------------")