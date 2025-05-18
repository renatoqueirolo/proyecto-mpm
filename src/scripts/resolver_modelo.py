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
start_time = time.time()

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

df_buses = pd.read_sql(f'''
    SELECT *
    FROM "BusTurno"
    WHERE "turnoId" = '{turno_id}';
''', engine)

df_planes = pd.read_sql(f'''
    SELECT PT.id AS plane_turno_id, P.*, PT."turnoId"
    FROM "PlaneTurno" PT
    JOIN "Plane" P ON PT."planeId" = P."id"
    WHERE PT."turnoId" = '{turno_id}';
''', engine)

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
df_buses["comunas_origen"] = df_buses["comunas_origen"].apply(lambda x: [normalizar(c) for c in json.loads(x)])
df_buses["comunas_destino"] = df_buses["comunas_destino"].apply(lambda x: [normalizar(c) for c in json.loads(x)])

# use_plane: 0 para regiones 1, 2, 3, 4 y 15; 1 para el resto
df_trabajadores["use_plane"] = df_trabajadores["region"].apply(lambda r: 0 if r in [1, 2, 3, 4, 15] else 1)
# use_bus: 1 para todas excepto RM (13), que es 0
df_trabajadores["use_bus"] = df_trabajadores["region"].apply(lambda r: 0 if r == 13 else 1)

# -------------------------
# Parámetros
# -------------------------
trabajadores = df_trabajadores["trabajador_id"].tolist()
comunas_trabajadores = df_trabajadores.set_index("trabajador_id")["acercamiento"].to_dict()
destino_trabajadores = df_trabajadores.set_index("trabajador_id")["destino"].to_dict()
origen_trabajadores = df_trabajadores.set_index("trabajador_id")["origen"].to_dict()
region_trabajadores = df_trabajadores.set_index("trabajador_id")["region"].to_dict()
use_plane_trabajadores = df_trabajadores.set_index("trabajador_id")["use_plane"].to_dict()
use_bus_trabajadores = df_trabajadores.set_index("trabajador_id")["use_bus"].to_dict()

buses = df_buses["id"].tolist()
vuelos = df_planes["plane_turno_id"].tolist()
CB = df_buses.set_index("id")["capacidad"].to_dict()
CV = df_planes.set_index("plane_turno_id")["capacidad"].to_dict()

def hora_str_a_minutos(hora_str):
    h, m = map(int, hora_str.split(":"))
    return h * 60 + m
    
HV = df_planes.set_index("plane_turno_id")["horario_salida"].apply(hora_str_a_minutos).to_dict()
HV_bajada = df_planes.set_index("plane_turno_id")["horario_llegada"].apply(hora_str_a_minutos).to_dict()

comunas_origen_bus = df_buses.set_index("id")["comunas_origen"].apply(lambda x: x if isinstance(x, list) else json.loads(x)).to_dict()
comunas_destino_bus = df_buses.set_index("id")["comunas_destino"].apply(lambda x: x if isinstance(x, list) else json.loads(x)).to_dict()
origen_planes = df_planes.set_index("plane_turno_id")["ciudad_origen"].str.upper().to_dict()
destino_planes = df_planes.set_index("plane_turno_id")["ciudad_destino"].str.upper().to_dict()

# -------------------------
# Modelo OR-Tools
# -------------------------
model = cp_model.CpModel()

#Parametros
min_hora = 800
max_hora = 2000
espera_conexion_subida = 180
espera_conexion_bajada = 10
tiempo_trayecto_bus = 60
tiempo_adicional_parada = 30
max_tiempo_ejecucion = 200 #segundos

#Restricciones y Variables
x = {}
y = {}
HB_var = {}

for t in trabajadores:
    for b in buses:
        x[(t, b)] = model.NewBoolVar(f'x_{t}_{b}')
    for v in vuelos:
        y[(t, v)] = model.NewBoolVar(f'y_{t}_{v}')

# Restricción: use bus y use vuelo por trabajador según región
for t in trabajadores:
    model.Add(sum(x[(t, b)] for b in buses) == use_bus_trabajadores[t])
    model.Add(sum(y[(t, v)] for v in vuelos) == use_plane_trabajadores[t])

# Restricción: capacidad buses y vuelos
for b in buses:
    model.Add(sum(x[(t, b)] for t in trabajadores) <= CB[b])
    HB_var[b] = model.NewIntVar(min_hora, max_hora, f'HB_{b}')
for v in vuelos:
    model.Add(sum(y[(t, v)] for t in trabajadores) <= CV[v])

# Restricción: compatibilidad de horario, origen y destino
for t in trabajadores:
    fila = df_trabajadores[df_trabajadores["trabajador_id"] == t].iloc[0]
    subida = fila["subida"]

    for b in buses:
        if use_bus_trabajadores[t] ==1:
            if subida:
                if normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_origen_bus[b]):
                    model.Add(x[(t, b)] == 0)
            else:
                if normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_destino_bus[b]):
                    model.Add(x[(t, b)] == 0)

    for v in vuelos:
        if use_plane_trabajadores[t] ==1:
            if normalizar(origen_planes[v]) != (normalizar(origen_trabajadores[t])):
                model.Add(y[(t, v)] == 0)
            if normalizar(destino_planes[v]) != (normalizar(destino_trabajadores[t])):
                model.Add(y[(t, v)] == 0)

    # Restricción de conexión temporal
    for b in buses:
        for v in vuelos:
            if subida:
                model.Add(HB_var[b] + espera_conexion_subida <= HV[v]).OnlyEnforceIf([x[(t, b)], y[(t, v)]])
            else:
                model.Add(HB_var[b] >= HV_bajada[v] + espera_conexion_bajada).OnlyEnforceIf([x[(t, b)], y[(t, v)]])

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
    if region_trabajadores[t] != 13:
        subida = df_trabajadores[df_trabajadores["trabajador_id"] == t]["subida"].values[0]
        for b in buses:
            for v in vuelos:
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

model.Minimize(sum(espera_total))

# Chequeo: variables que fueron creadas
print(f"\n📦 Variables x creadas: {len(x)}")
print(f"📦 Variables y creadas: {len(y)}")
print(f"📦 Variables HB_var creadas: {len(HB_var)}")
print(f"📦 Variables comb creadas: {len(comb_vars)}")
print(f"📦 Variables espera creadas: {len(espera_total)}")

print("🔍 Total trabajadores:", len(trabajadores))
print("🔍 Total buses:", len(buses))
print("🔍 Total vuelos:", len(vuelos))
print("🔍 Capacidad total buses:", sum(CB.values()))
print("🔍 Capacidad total vuelos:", sum(CV.values()))

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
    if trabajadores_no_rm:
        print("Espera Promedio:", solver.ObjectiveValue() / len(trabajadores_no_rm))
    else:
        print("No hay trabajadores fuera de la Región Metropolitana (Región 13)")
        print("Espera Promedio:", solver.ObjectiveValue())

else:
    print("❌ No se encontró solución.")
    exit()

# -------------------------
# Guardar Resultados
# -------------------------
# Limpiar asignaciones anteriores del turno
cursor.execute('''
    DELETE FROM "AssignmentBus"
    WHERE "busTurnoId" IN (
        SELECT id FROM "BusTurno" WHERE "turnoId" = %s
    )
''', (turno_id,))

cursor.execute('''
    DELETE FROM "AssignmentPlane"
    WHERE "planeTurnoId" IN (
        SELECT id FROM "PlaneTurno" WHERE "turnoId" = %s
    )
''', (turno_id,))
conn.commit()

# Insertar asignaciones de bus
for t in trabajadores:
    for b in buses:
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

# -------------------------
# Actualizar horarios optimizados de buses
# -------------------------
cursor.execute('SELECT "fecha" FROM "Turno" WHERE "id" = %s', (turno_id,))
row = cursor.fetchone()
if not row:
    print(f"No se encontró el turno con ID {turno_id}")
    exit()
fecha_turno = row[0]

for b in buses:
    horario_llegada_min = solver.Value(HB_var[b])
    horario_llegada = datetime.combine(fecha_turno.date(), datetime.min.time()) + timedelta(minutes=horario_llegada_min)
    duracion = tiempo_trayecto_bus
    if len(comunas_origen_bus[b]) > 1:
        duracion += tiempo_adicional_parada*(len(comunas_origen_bus[b])-1)
    horario_salida = horario_llegada - timedelta(minutes=duracion)  # duración fija del trayecto

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