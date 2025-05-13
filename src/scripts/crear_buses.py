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

# Configuración inicial
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

THRESHOLD_DISTANCE = 40

# Mapear comunas a regiones
comuna_a_region = {
    "VIÑA DEL MAR": "V",
    "SAN ANTONIO": "IV",
    "LA CALERA": "V",
    "SANTIAGO": "RM",
    "LOS ANDES": "V",
    # Agrega más comunas según sea necesario
}

# Capacidades por región
capacidades_por_region = {
    "V": [12, 20, 10],
    "IV": [16, 8],
    "RM": [20, 30],
}

def obtener_distancia(comuna1, comuna2):
    distancias = {
        ("LA CALERA", "VIÑA DEL MAR"): 15,
        ("LA CALERA", "SAN ANTONIO"): 50,
        ("VIÑA DEL MAR", "SAN ANTONIO"): 35,
        ("VIÑA DEL MAR", "LOS ANDES"): 130,
        ("SAN ANTONIO", "LOS ANDES"): 145,
        ("LA CALERA", "LOS ANDES"): 120,
    }
    if comuna1 == comuna2:
        return 0
    return distancias.get((comuna1, comuna2)) or distancias.get((comuna2, comuna1)) or 1000

def asignar_buses_por_comuna(df_filtrado, nombre="SUBIDA"):
    from collections import defaultdict

    # 1. Asignar regiones a las comunas y contar los trabajadores por comuna
    df_filtrado['region'] = df_filtrado['acercamiento'].map(comuna_a_region)
    trabajadores_por_comuna = df_filtrado['acercamiento'].value_counts().to_dict()

    # 2. Organizar comunas por región
    comunas_por_region = defaultdict(list)
    for comuna in trabajadores_por_comuna:
        region = comuna_a_region.get(comuna)
        if region:
            comunas_por_region[region].append(comuna)

    bus_info = []
    bus_counter = 1
    remanentes = {}

    # 3. Fase uno: asignar buses con un solo destino
    for comuna, cantidad in trabajadores_por_comuna.items():
        region = comuna_a_region.get(comuna)
        if not region:
            continue

        capacidades = sorted(capacidades_por_region.get(region, []), reverse=True)

        for cap in capacidades:
            while cantidad >= cap:
                bus_info.append({
                    "id": f"{nombre.lower()}_bus{bus_counter}",
                    "region": region,
                    "capacidad": cap,
                    "comunas": [comuna],
                    "subida": nombre == "SUBIDA"
                })
                bus_counter += 1
                cantidad -= cap

        if cantidad > 0:
            remanentes[comuna] = {"region": region, "cantidad": cantidad}

    # 4. Fase dos: agrupar remanentes cercanos dentro de su región
    usados = set()
    for region, comunas in comunas_por_region.items():
        capacidades = sorted(capacidades_por_region.get(region, []), reverse=True)

        # Filtrar comunas con remanentes en esta región
        comunas_region_rem = [c for c in comunas if c in remanentes and (region, c) not in usados]

        while comunas_region_rem:
            base = comunas_region_rem[0]
            grupo = [(base, remanentes[base]["cantidad"])]
            usados.add((region, base))

            # Buscar comunas cercanas dentro del threshold
            for other in comunas_region_rem[1:]:
                if (region, other) in usados:
                    continue
                if obtener_distancia(base, other) <= THRESHOLD_DISTANCE:
                    grupo.append((other, remanentes[other]["cantidad"]))
                    usados.add((region, other))

            # Intentar llenar buses con el grupo
            total = sum(cant for _, cant in grupo)
            asignado = False
            for cap in capacidades:
                if total >= cap:
                    restantes = cap
                    comunas_en_bus = []
                    for i in range(len(grupo)):
                        comuna_i, cant_i = grupo[i]
                        if cant_i > 0 and restantes > 0:
                            tomar = min(restantes, cant_i)
                            if comuna_i not in comunas_en_bus:
                                comunas_en_bus.append(comuna_i)
                            grupo[i] = (comuna_i, cant_i - tomar)
                            restantes -= tomar
                    bus_info.append({
                        "id": f"{nombre.lower()}_bus{bus_counter}",
                        "region": region,
                        "capacidad": cap,
                        "comunas": comunas_en_bus,
                        "subida": nombre == "SUBIDA"
                    })
                    bus_counter += 1
                    asignado = True
                    break

            # Si no se asignó ningún bus, usar la capacidad mínima posible con todas las comunas remanentes
            if not asignado and total > 0:
                comunas_en_bus = [comuna for comuna, cant in grupo if cant > 0]
                bus_info.append({
                    "id": f"{nombre.lower()}_bus{bus_counter}",
                    "region": region,
                    "capacidad": min(capacidades),
                    "comunas": comunas_en_bus,
                    "subida": nombre == "SUBIDA"
                })
                bus_counter += 1

            # Quitar comunas ya usadas
            comunas_region_rem = [c for c in comunas_region_rem if (region, c) not in usados]

    return bus_info




# Separar trabajadores por sentido
df_subida = df_tt[df_tt["subida"] == True].copy()
df_bajada = df_tt[df_tt["subida"] == False].copy()

# Asignar buses
buses_subida = asignar_buses_por_comuna(df_subida, "SUBIDA")
buses_bajada = asignar_buses_por_comuna(df_bajada, "BAJADA")

todos_los_buses = buses_subida + buses_bajada

for bus in todos_los_buses:
    print(bus)
    bus_id = bus["id"]
    capacidad = bus["capacidad"]
    subida = bus["subida"]
    comunas_origen = bus["comunas"] if subida else ["SANTIAGO"]
    comunas_destino = ["SANTIAGO"] if subida else bus["comunas"]

    hora_base = 870 if subida else 2000
    hora_salida = datetime.combine(datetime.today(), datetime.min.time()) + timedelta(minutes=hora_base)
    hora_llegada = hora_salida + timedelta(minutes=60)

    # Insertar en tabla Bus
    cursor.execute('SELECT COUNT(*) FROM "Bus" WHERE "id" = %s', (bus_id,))
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO "Bus" (
                "id", "capacidad", "horario_salida", "horario_llegada", 
                "comunas_origen", "comunas_destino"
            ) VALUES (%s, %s, %s, %s, %s, %s);
        ''', (
            bus_id,
            capacidad,
            hora_salida,
            hora_llegada,
            json.dumps(comunas_origen),
            json.dumps(comunas_destino)
        ))

    # Insertar en tabla BusTurno
    cursor.execute('SELECT COUNT(*) FROM "BusTurno" WHERE "busId" = %s AND "turnoId" = %s', (bus_id, turno_id))
    if cursor.fetchone()[0] == 0:
        cursor.execute('''
            INSERT INTO "BusTurno" (
                id, "turnoId", "busId", "capacidad", "horario_salida", "horario_llegada"
            ) VALUES (%s, %s, %s, %s, %s, %s)
        ''', (
            str(uuid4()),
            turno_id,
            bus_id,
            capacidad,
            hora_salida,
            hora_llegada
        ))

conn.commit()
print(f"Buses creados exitosamente para el turno {turno_id}.")
