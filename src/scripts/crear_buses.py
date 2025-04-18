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

# Cargar variables de entorno
load_dotenv()
DB_URL = os.getenv("DATABASE_URL")
conn = psycopg2.connect(DB_URL)
cursor = conn.cursor()

# CARGA DE DATOS DESDE LA BASE DE DATOS
print("Cargando datos desde la base de datos...")

engine = create_engine(DB_URL)

df_total = pd.read_sql('SELECT * FROM "Worker";', engine)
df_aviones = pd.read_sql('SELECT * FROM "Plane";', engine)

# Preprocesamiento de datos
trabajadores = df_total["rut"].tolist()
comunas_trabajadores = df_total.set_index("rut")["acercamiento"].str.upper().to_dict()
destino_trabajadores = df_total.set_index("rut")["destinoAvion"].str.upper().to_dict()
origen_trabajadores = df_total.set_index("rut")["origenAvion"].str.upper().to_dict()
subida_trabajadores = df_total.set_index("rut")["subida"].astype(int).to_dict()

CANTIDAD_BUSES_SUBIDA = 5
CANTIDAD_BUSES_BAJADA = 5
CAPACIDAD_BUS = 51
THRESHOLD_DISTANCE = 40

# --- FUNCIONES AUXILIARES ---
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

df_subida = df_total[df_total["subida"] == True]
df_bajada = df_total[df_total["subida"] == False]
comunas_por_bus_subida, buses_subida, rutas_subida = asignar_buses(df_subida, CAPACIDAD_BUS, CANTIDAD_BUSES_SUBIDA, "SUBIDA")
comunas_por_bus_bajada, buses_bajada, rutas_bajada = asignar_buses(df_bajada, CAPACIDAD_BUS, CANTIDAD_BUSES_BAJADA, "BAJADA")

buses = buses_subida + buses_bajada
comunas_origen_bus = {**{b: v for b, v in comunas_por_bus_subida.items()}, **{b: ["SANTIAGO"] for b in buses_bajada}}
comunas_destino_bus = {**{b: ["SANTIAGO"] for b in buses_subida}, **{b: v for b, v in comunas_por_bus_bajada.items()}}

CB_b = {bus: CAPACIDAD_BUS for bus in buses}
HB_b = {bus: 870 if "subida" in bus else 2000 for bus in buses}

def hora_a_minutos(dt):
    return dt.hour * 60 + dt.minute + (1440 if dt.hour < 5 else 0)

vuelos = df_aviones["id_plane"].tolist()
CV_v = dict(zip(df_aviones["id_plane"], df_aviones["capacidad"]))
HV_v = {
    row.id_plane: hora_a_minutos(row.horario_salida if row.subida else row.horario_llegada)
    for _, row in df_aviones.iterrows()
}
origen_vuelos = dict(zip(df_aviones["id_plane"], df_aviones["ciudad_origen"].str.upper()))
destino_vuelos = dict(zip(df_aviones["id_plane"], df_aviones["ciudad_destino"].str.upper()))
subida_vuelos = dict(zip(df_aviones["id_plane"], df_aviones["subida"]))

# --- GUARDAR LOS BUSES EN LA TABLA ---
print("Guardando buses en la tabla 'Bus'...")
for bus_id in buses:
    subida = True if "subida" in bus_id else False
    comunas_origen = comunas_origen_bus[bus_id]
    comunas_destino = comunas_destino_bus[bus_id]

    cursor.execute('''
        INSERT INTO "Bus" (
            "id_bus", "capacidad", "subida", "horario_salida", "horario_llegada",
            "comunas_origen", "comunas_destino"
        ) VALUES (%s, %s, %s, %s, %s, %s, %s);
    ''', (
        bus_id,
        CAPACIDAD_BUS,
        subida,
        datetime.combine(datetime.today(), datetime.min.time()) + timedelta(minutes=HB_b[bus_id]),
        datetime.combine(datetime.today(), datetime.min.time()) + timedelta(minutes=HB_b[bus_id] + 60),
        json.dumps(comunas_origen),
        json.dumps(comunas_destino)
    ))

conn.commit()
print("Buses guardados exitosamente.")