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

CANTIDAD_BUSES_SUBIDA = 5
CANTIDAD_BUSES_BAJADA = 5
CAPACIDAD_BUS = 51
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

def asignar_buses(df_filtrado, capacidad_bus, cantidad_maxima, nombre="SUBIDA"):
    conteo = Counter(df_filtrado["acercamiento"].str.upper())
    full_alloc, remainders = [], {}
    for comuna, cantidad in conteo.items():
        full_alloc += [[comuna]] * (cantidad // capacidad_bus)
        if cantidad % capacidad_bus > 0:
            remainders[comuna] = cantidad % capacidad_bus

    paired_alloc, usado = [], [False]*len(remainders)
    remainders_list = list(remainders.items())
    for i, (comuna_i, cant_i) in enumerate(remainders_list):
        if usado[i]: continue
        allocation = [comuna_i]
        usado[i] = True
        for j in range(i+1, len(remainders_list)):
            comuna_j, cant_j = remainders_list[j]
            if not usado[j] and cant_i + cant_j <= capacidad_bus and obtener_distancia(comuna_i, comuna_j) <= THRESHOLD_DISTANCE:
                allocation.append(comuna_j)
                usado[j] = True
                break
        paired_alloc.append(allocation)

    allocations = full_alloc + paired_alloc
    bus_ids = [f"{nombre.lower()}_bus{i+1}" for i in range(min(len(allocations), cantidad_maxima))]
    comunas_por_bus = {bus_ids[i]: allocations[i] for i in range(len(bus_ids))}
    return comunas_por_bus, bus_ids, allocations

df_subida = df_tt[df_tt["subida"] == True]
df_bajada = df_tt[df_tt["subida"] == False]

comunas_por_bus_subida, buses_subida, _ = asignar_buses(df_subida, CAPACIDAD_BUS, CANTIDAD_BUSES_SUBIDA, "SUBIDA")
comunas_por_bus_bajada, buses_bajada, _ = asignar_buses(df_bajada, CAPACIDAD_BUS, CANTIDAD_BUSES_BAJADA, "BAJADA")

buses = buses_subida + buses_bajada
comunas_origen_bus = {**{b: v for b, v in comunas_por_bus_subida.items()}, **{b: ["SANTIAGO"] for b in buses_bajada}}
comunas_destino_bus = {**{b: ["SANTIAGO"] for b in buses_subida}, **{b: v for b, v in comunas_por_bus_bajada.items()}}

CB_b = {bus: CAPACIDAD_BUS for bus in buses}
HB_b = {bus: 870 if "subida" in bus else 2000 for bus in buses}

# Obtener la fecha real del turno desde la tabla "Turno"
cursor.execute('SELECT "fecha" FROM "Turno" WHERE "id" = %s', (turno_id,))
row = cursor.fetchone()

if not row:
    print(f"No se encontró el turno con ID {turno_id}")
    exit()

fecha_turno = row[0]  # Este es un datetime.date o datetime.datetime

for bus_id in buses:
    subida = "subida" in bus_id
    comunas_origen = comunas_origen_bus[bus_id]
    comunas_destino = comunas_destino_bus[bus_id]


    # Verificar si el bus ya existe
    cursor.execute('SELECT COUNT(*) FROM "BusTurno" WHERE "id" = %s', (bus_id,))
    existe = cursor.fetchone()[0]

    if not existe:
        cursor.execute('''
            INSERT INTO "BusTurno" (
                id, "turnoId", "capacidad", "horario_salida", "horario_llegada", "comunas_origen", "comunas_destino"
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        ''', (
            bus_id,
            turno_id,
            CAPACIDAD_BUS,
            datetime.combine(fecha_turno.date(), datetime.min.time()) + timedelta(minutes=HB_b[bus_id]),
            datetime.combine(fecha_turno.date(), datetime.min.time()) + timedelta(minutes=HB_b[bus_id] + 60),
            json.dumps(comunas_origen),
            json.dumps(comunas_destino)
        ))



conn.commit()
print(f"Buses creados exitosamente para el turno {turno_id}.")