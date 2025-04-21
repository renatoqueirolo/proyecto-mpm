# import pandas as pd
# import numpy as np
# from ortools.sat.python import cp_model
# from collections import defaultdict
# import psycopg2
# from sqlalchemy import create_engine
# import os
# from dotenv import load_dotenv
# import argparse
# from uuid import uuid4
# import json
# import unicodedata

# def normalizar(texto):
#     return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('utf-8').strip().lower()

# parser = argparse.ArgumentParser()
# parser.add_argument("--turnoId", required=True, help="ID del turno")
# args = parser.parse_args()
# turno_id = args.turnoId

# load_dotenv()
# DB_URL = os.getenv("DATABASE_URL")

# conn = psycopg2.connect(DB_URL)
# cursor = conn.cursor()
# engine = create_engine(DB_URL)

# # Cargar trabajadores del turno
# df_trabajadores = pd.read_sql(f'''
#     SELECT TT.id, TT."trabajadorId", TT.subida, TT.origen, TT.destino, T.rut, T."nombreCompleto"
#     FROM "TrabajadorTurno" TT
#     JOIN "Trabajador" T ON TT."trabajadorId" = T.id
#     WHERE TT."turnoId" = '{turno_id}';
# ''', engine)

# if df_trabajadores.empty:
#     print(f"No hay trabajadores en el turno {turno_id}")
#     exit()

# # Cargar buses y vuelos del turno
# df_buses = pd.read_sql(f'''
#     SELECT BT.*, B."comunas_origen", B."comunas_destino"
#     FROM "BusTurno" BT
#     JOIN "Bus" B ON BT."busId" = B."id"
#     WHERE BT."turnoId" = '{turno_id}';
# ''', engine)

# df_planes = pd.read_sql(f'''
#     SELECT PT.*, P."ciudad_origen", P."ciudad_destino"
#     FROM "PlaneTurno" PT
#     JOIN "Plane" P ON PT."planeId" = P."id"
#     WHERE PT."turnoId" = '{turno_id}';
# ''', engine)

# # Construcción de sets
# trabajadores = list(df_trabajadores["id"])
# buses = list(df_buses["id"])
# planes = list(df_planes["id"])

# CAP_B = {j: int(df_buses[df_buses["id"] == j]["capacidad"].values[0]) for j in buses}
# CAP_P = {k: int(df_planes[df_planes["id"] == k]["capacidad"].values[0]) for k in planes}

# W_b = {}
# W_p = {}

# for t in trabajadores:
#     fila = df_trabajadores[df_trabajadores["id"] == t].iloc[0]
#     origen_t = normalizar(fila["origen"])
#     destino_t = normalizar(fila["destino"])
#     subida = fila["subida"]

#     if subida:
#         W_b[t] = [
#             j for j in buses
#             if origen_t in [normalizar(c) for c in json.loads(df_buses[df_buses["id"] == j]["comunas_origen"].values[0])]
#             and "santiago" in [normalizar(c) for c in json.loads(df_buses[df_buses["id"] == j]["comunas_destino"].values[0])]
#         ]
#         W_p[t] = [
#             k for k in planes
#             if normalizar(df_planes[df_planes["id"] == k]["ciudad_origen"].values[0]) == "santiago"
#             and normalizar(df_planes[df_planes["id"] == k]["ciudad_destino"].values[0]) == destino_t
#         ]
#     else:
#         # Bajada: vuelo desde destino → Santiago, luego bus desde Santiago → comuna
#         W_p[t] = [
#             k for k in planes
#             if normalizar(df_planes[df_planes["id"] == k]["ciudad_origen"].values[0]) == destino_t
#             and normalizar(df_planes[df_planes["id"] == k]["ciudad_destino"].values[0]) == "santiago"
#         ]
#         W_b[t] = [
#             j for j in buses
#             if "santiago" in [normalizar(c) for c in json.loads(df_buses[df_buses["id"] == j]["comunas_origen"].values[0])]
#             and destino_t in [normalizar(c) for c in json.loads(df_buses[df_buses["id"] == j]["comunas_destino"].values[0])]
#         ]

# # ------------------------------
# # OR-TOOLS
# # ------------------------------
# model = cp_model.CpModel()
# x = {}
# y = {}
# u = {j: model.NewBoolVar(f'u_{j}') for j in buses}
# v = {k: model.NewBoolVar(f'v_{k}') for k in planes}

# for t in trabajadores:
#     for j in W_b[t]:
#         x[t, j] = model.NewBoolVar(f'x_{t}_{j}')
#         model.Add(x[t, j] <= u[j])
#     for k in W_p[t]:
#         y[t, k] = model.NewBoolVar(f'y_{t}_{k}')
#         model.Add(y[t, k] <= v[k])

# for t in trabajadores:
#     subida = df_trabajadores[df_trabajadores["id"] == t]["subida"].values[0]
#     if subida:
#         model.Add(sum(x[t, j] for j in W_b[t]) == 1)
#         model.Add(sum(y[t, k] for k in W_p[t]) == 1)
#     else:
#         model.Add(sum(y[t, k] for k in W_p[t]) == 1)
#         model.Add(sum(x[t, j] for j in W_b[t]) == 1)

# for j in buses:
#     model.Add(sum(x[t, j] for t in trabajadores if (t, j) in x) <= CAP_B[j])
# for k in planes:
#     model.Add(sum(y[t, k] for t in trabajadores if (t, k) in y) <= CAP_P[k])

# model.Minimize(sum(u[j] for j in buses) + sum(v[k] for k in planes))

# # ------------------------------
# # Resolver
# # ------------------------------
# solver = cp_model.CpSolver()
# status = solver.Solve(model)

# if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
#     print("No se encontró solución.")
#     exit()


# # Elimina asignaciones anteriores del turno
# cursor.execute('''
#     DELETE FROM "AssignmentBus"
#     WHERE "busTurnoId" IN (
#         SELECT id FROM "BusTurno" WHERE "turnoId" = %s
#     )
# ''', (turno_id,))

# cursor.execute('''
#     DELETE FROM "AssignmentPlane"
#     WHERE "planeTurnoId" IN (
#         SELECT id FROM "PlaneTurno" WHERE "turnoId" = %s
#     )
# ''', (turno_id,))
# conn.commit()

# # Cargar mapeo de BusTurno y PlaneTurno
# bus_turno_map = pd.read_sql(f'''
#     SELECT id, "busId" FROM "BusTurno"
#     WHERE "turnoId" = '{turno_id}';
# ''', engine).set_index("busId")["id"].to_dict()

# plane_turno_map = pd.read_sql(f'''
#     SELECT id, "planeId" FROM "PlaneTurno"
#     WHERE "turnoId" = '{turno_id}';
# ''', engine).set_index("planeId")["id"].to_dict()

# # Insertar nuevas asignaciones
# for t in trabajadores:
#     for j in W_b[t]:
#         if solver.Value(x[t, j]):
#             cursor.execute('''
#                 INSERT INTO "AssignmentBus" (id, "trabajadorTurnoId", "busTurnoId")
#                 VALUES (%s, %s, %s)
#             ''', (str(uuid.uuid4()), t, bus_turno_map[j]))

#     for k in W_p[t]:
#         if solver.Value(y[t, k]):
#             cursor.execute('''
#                 INSERT INTO "AssignmentPlane" (id, "trabajadorTurnoId", "planeTurnoId")
#                 VALUES (%s, %s, %s)
#             ''', (str(uuid.uuid4()), t, plane_turno_map[k]))



# conn.commit()
# cursor.close()
# conn.close()

# print(f"Asignaciones realizadas para el turno {turno_id} ✅")

from ortools.sat.python import cp_model
import pandas as pd
import numpy as np
import json
import psycopg2
import os
import argparse
from dotenv import load_dotenv
from uuid import uuid4
from datetime import datetime
from sqlalchemy import create_engine
import unicodedata

def normalizar(texto):
    if not isinstance(texto, str):
        return ''
    return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('utf-8').strip().upper()

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
    SELECT TT.id AS trabajador_id, TT.subida, TT.origen, TT.destino, TT.acercamiento, T.rut
    FROM "TrabajadorTurno" TT
    JOIN "Trabajador" T ON TT."trabajadorId" = T.id
    WHERE TT."turnoId" = '{turno_id}';
''', engine)

df_buses = pd.read_sql(f'''
    SELECT BT.id AS bus_turno_id, B.*, BT."turnoId"
    FROM "BusTurno" BT
    JOIN "Bus" B ON BT."busId" = B."id"
    WHERE BT."turnoId" = '{turno_id}';
''', engine)

df_planes = pd.read_sql(f'''
    SELECT PT.id AS plane_turno_id, P.*, PT."turnoId"
    FROM "PlaneTurno" PT
    JOIN "Plane" P ON PT."planeId" = P."id"
    WHERE PT."turnoId" = '{turno_id}';
''', engine)

df_trabajadores["origen"] = df_trabajadores["origen"].apply(normalizar)
df_trabajadores["destino"] = df_trabajadores["destino"].apply(normalizar)
df_planes["ciudad_origen"] = df_planes["ciudad_origen"].apply(normalizar)
df_planes["ciudad_destino"] = df_planes["ciudad_destino"].apply(normalizar)
df_buses["comunas_origen"] = df_buses["comunas_origen"].apply(lambda x: [normalizar(c) for c in json.loads(x)])
df_buses["comunas_destino"] = df_buses["comunas_destino"].apply(lambda x: [normalizar(c) for c in json.loads(x)])

# -------------------------
# Preprocesamiento
# -------------------------
trabajadores = df_trabajadores["trabajador_id"].tolist()
comunas_trabajadores = df_trabajadores.set_index("trabajador_id")["acercamiento"].str.upper().to_dict()
destino_trabajadores = df_trabajadores.set_index("trabajador_id")["destino"].str.upper().to_dict()
origen_trabajadores = df_trabajadores.set_index("trabajador_id")["origen"].str.upper().to_dict()
buses = df_buses["bus_turno_id"].tolist()
vuelos = df_planes["plane_turno_id"].tolist()


CB = df_buses.set_index("bus_turno_id")["capacidad"].to_dict()
CV = df_planes.set_index("plane_turno_id")["capacidad"].to_dict()

def hora_str_a_minutos(hora_str):
    h, m = map(int, hora_str.split(":"))
    return h * 60 + m

HB = df_buses.set_index("bus_turno_id").apply(
    lambda r: int(pd.to_datetime(r["horario_llegada"]).hour * 60 + pd.to_datetime(r["horario_llegada"]).minute), axis=1).to_dict()
    
HV = df_planes.set_index("plane_turno_id")["horario_salida"].apply(hora_str_a_minutos).to_dict()


comunas_origen_bus = df_buses.set_index("bus_turno_id")["comunas_origen"].apply(
    lambda x: x if isinstance(x, list) else json.loads(x)
).to_dict()
comunas_destino_bus = df_buses.set_index("bus_turno_id")["comunas_destino"].apply(
    lambda x: x if isinstance(x, list) else json.loads(x)
).to_dict()
origen_planes = df_planes.set_index("plane_turno_id")["ciudad_origen"].str.upper().to_dict()
destino_planes = df_planes.set_index("plane_turno_id")["ciudad_destino"].str.upper().to_dict()

# -------------------------
# Modelo OR-Tools
# -------------------------
model = cp_model.CpModel()
x = {}
y = {}

for t in trabajadores:
    for b in buses:
        x[(t, b)] = model.NewBoolVar(f'x_{t}_{b}')
    for v in vuelos:
        y[(t, v)] = model.NewBoolVar(f'y_{t}_{v}')

# Restricción: 1 bus y 1 vuelo por trabajador
for t in trabajadores:
    model.Add(sum(x[(t, b)] for b in buses) == 1)
    model.Add(sum(y[(t, v)] for v in vuelos) == 1)

# Restricción: capacidad buses y vuelos
for b in buses:
    model.Add(sum(x[(t, b)] for t in trabajadores) <= CB[b])
for v in vuelos:
    model.Add(sum(y[(t, v)] for t in trabajadores) <= CV[v])

# Restricción: compatibilidad de horario y rutas
for t in trabajadores:
    fila = df_trabajadores[df_trabajadores["trabajador_id"] == t].iloc[0]
    subida = fila["subida"]

    for b in buses:
        if subida:
            if normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_origen_bus[b]):
                model.Add(x[(t, b)] == 0)
        else:
            if normalizar(comunas_trabajadores[t]) not in map(str.upper, comunas_destino_bus[b]):
                model.Add(x[(t, b)] == 0)

    for v in vuelos:
        if normalizar(origen_planes[v]) != (normalizar(origen_trabajadores[t])):
            model.Add(y[(t, v)] == 0)
        if normalizar(destino_planes[v]) != (normalizar(destino_trabajadores[t])):
            model.Add(y[(t, v)] == 0)

    # Restricción de conexión temporal
    for b in buses:
        for v in vuelos:
            if subida:
                if HB[b] + 180 > HV[v]:
                    model.AddBoolOr([x[(t, b)].Not(), y[(t, v)].Not()])

# -------------------------
# Logs para depuración
# -------------------------

print("\n📋 Validando compatibilidad de rutas por trabajador:")
incompatibles_bus = 0
incompatibles_vuelo = 0

for t in trabajadores:
    subida = df_trabajadores[df_trabajadores["trabajador_id"] == t]["subida"].values[0]

    buses_validos = [b for b in buses if normalizar(comunas_trabajadores[t]) in comunas_origen_bus[b]] if subida \
                    else [b for b in buses if normalizar(comunas_trabajadores[t]) in comunas_destino_bus[b]]
    vuelos_validos = [v for v in vuelos
                      if normalizar(origen_planes[v]) == normalizar(origen_trabajadores[t])
                      and normalizar(destino_planes[v]) == normalizar(destino_trabajadores[t])]

    if len(buses_validos) == 0:
        print(f"⚠️ Trabajador {t} sin buses compatibles ({'SUBIDA' if subida else 'BAJADA'})")
        incompatibles_bus += 1
    if len(vuelos_validos) == 0:
        print(f"⚠️ Trabajador {t} sin vuelos compatibles")
        incompatibles_vuelo += 1

print(f"\n🚫 Trabajadores sin buses compatibles: {incompatibles_bus}")
print(f"🚫 Trabajadores sin vuelos compatibles: {incompatibles_vuelo}")

# Chequeo adicional: variables que sí fueron creadas
print(f"\n📦 Variables x creadas: {len(x)}")
print(f"📦 Variables y creadas: {len(y)}")


# -------------------------
# Función objetivo: minimizar espera
# -------------------------
espera_total = []
for t in trabajadores:
    for b in buses:
        for v in vuelos:
            subida = df_trabajadores[df_trabajadores["trabajador_id"] == t]["subida"].values[0]
            diff = HV[v] - HB[b] if subida else HB[b] - HV[v]
            comb = model.NewBoolVar(f'c_{t}_{b}_{v}')
            model.AddBoolAnd([x[(t, b)], y[(t, v)]]).OnlyEnforceIf(comb)
            model.AddBoolOr([x[(t, b)].Not(), y[(t, v)].Not()]).OnlyEnforceIf(comb.Not())
            espera_total.append(diff * comb)

model.Minimize(sum(espera_total))

print("🔍 Total trabajadores:", len(trabajadores))
print("🔍 Total buses:", len(buses))
print("🔍 Total vuelos:", len(vuelos))
print("🔍 Capacidad total buses:", sum(CB.values()))
print("🔍 Capacidad total vuelos:", sum(CV.values()))



# -------------------------
# Resolver
# -------------------------
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 30
# Tiempo límite y estadísticas iniciales
print(f"\n🧠 Tiempo límite de resolución: {solver.parameters.max_time_in_seconds} segundos")
print("📈 Comenzando resolución...")
status = solver.Solve(model)

if status in [cp_model.FEASIBLE, cp_model.OPTIMAL]:
    print("✅ Solución encontrada. Valor objetivo:", solver.ObjectiveValue())
else:
    print("❌ No se encontró solución.")
    exit()

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

conn.commit()
cursor.close()
conn.close()
print(f"✈️🚌 Asignaciones insertadas exitosamente para el turno {turno_id}")

