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
engine = create_engine(DB_URL)

# Carga desde la base de datos
print("Cargando datos desde la base de datos...")
df_total = pd.read_sql('SELECT * FROM "Worker";', engine)
df_aviones = pd.read_sql('SELECT * FROM "Plane";', engine)
df_buses = pd.read_sql('SELECT * FROM "Bus";', engine)

# Preprocesamiento de datos
trabajadores = df_total["rut"].tolist()
comunas_trabajadores = df_total.set_index("rut")["acercamiento"].str.upper().to_dict()
destino_trabajadores = df_total.set_index("rut")["destinoAvion"].str.upper().to_dict()
origen_trabajadores = df_total.set_index("rut")["origenAvion"].str.upper().to_dict()
subida_trabajadores = df_total.set_index("rut")["subida"].astype(int).to_dict()

# BUSES
buses = df_buses["id_bus"].tolist()
CB_b = dict(zip(df_buses["id_bus"], df_buses["capacidad"]))
HB_b = {
    row.id_bus: int(row.horario_llegada.hour * 60 + row.horario_llegada.minute)
    for _, row in df_buses.iterrows()
}
comunas_origen_bus = {
    row.id_bus: json.loads(row.comunas_origen) for _, row in df_buses.iterrows()
}
comunas_destino_bus = {
    row.id_bus: json.loads(row.comunas_destino) for _, row in df_buses.iterrows()
}

# AVIONES
vuelos = df_aviones["id_plane"].tolist()
CV_v = dict(zip(df_aviones["id_plane"], df_aviones["capacidad"]))
HV_v = {
    row.id_plane: int((row.horario_salida if row.subida else row.horario_llegada).hour * 60 + (row.horario_salida if row.subida else row.horario_llegada).minute + (1440 if (row.horario_salida if row.subida else row.horario_llegada).hour < 5 else 0))
    for _, row in df_aviones.iterrows()
}
origen_vuelos = dict(zip(df_aviones["id_plane"], df_aviones["ciudad_origen"].str.upper()))
destino_vuelos = dict(zip(df_aviones["id_plane"], df_aviones["ciudad_destino"].str.upper()))

# --- MODELO DE OPTIMIZACIÓN ---
model = cp_model.CpModel()
bus_var = {}
vuelo_var = {}

for t in trabajadores:
    for b in buses:
        bus_var[(t, b)] = model.NewBoolVar(f'bus_{t}_{b}')
    for v in vuelos:
        vuelo_var[(t, v)] = model.NewBoolVar(f'vuelo_{t}_{v}')

# Restricción: cada trabajador toma 1 bus y 1 vuelo
for t in trabajadores:
    model.Add(sum(bus_var[(t, b)] for b in buses) == 1)
    model.Add(sum(vuelo_var[(t, v)] for v in vuelos) == 1)

# Restricción: capacidades
for b in buses:
    model.Add(sum(bus_var[(t, b)] for t in trabajadores) <= CB_b[b])
for v in vuelos:
    model.Add(sum(vuelo_var[(t, v)] for t in trabajadores) <= CV_v[v])

# Restricciones adicionales
for t in trabajadores:
    for b in buses:
        if subida_trabajadores[t] == 1:
            for v in vuelos:
                if HB_b[b] + 180 > HV_v[v]:
                    model.AddBoolOr([bus_var[(t, b)].Not(), vuelo_var[(t, v)].Not()])

    for b in buses:
        if subida_trabajadores[t] == 1:
            if comunas_trabajadores[t] not in comunas_origen_bus[b]:
                model.Add(bus_var[(t, b)] == 0)
        else:
            if comunas_trabajadores[t] not in comunas_destino_bus[b]:
                model.Add(bus_var[(t, b)] == 0)

    for v in vuelos:
        if destino_vuelos[v] != destino_trabajadores[t] or origen_vuelos[v] != origen_trabajadores[t]:
            model.Add(vuelo_var[(t, v)] == 0)

# Función objetivo: minimizar espera
espera_total = []
for t in trabajadores:
    for b in buses:
        for v in vuelos:
            diff = HV_v[v] - HB_b[b] if subida_trabajadores[t] == 1 else HB_b[b] - HV_v[v]
            comb = model.NewBoolVar(f"emp_{t}_{b}_{v}")
            model.AddBoolAnd([bus_var[(t, b)], vuelo_var[(t, v)]]).OnlyEnforceIf(comb)
            model.AddBoolOr([bus_var[(t, b)].Not(), vuelo_var[(t, v)].Not()]).OnlyEnforceIf(comb.Not())
            espera_total.append(diff * comb)

model.Minimize(sum(espera_total))

# SOLVER
solver = cp_model.CpSolver()
status = solver.Solve(model)

# Guardar resultados
if status in [cp_model.FEASIBLE, cp_model.OPTIMAL]:
    print("Guardando asignaciones en base de datos...")
    for t in trabajadores:
        b_asig = next(b for b in buses if solver.Value(bus_var[(t, b)]) == 1)
        v_asig = next(v for v in vuelos if solver.Value(vuelo_var[(t, v)]) == 1)

        trayecto = 'ida' if subida_trabajadores[t] == 1 else 'vuelta'
        fecha_actual = datetime.today()

        cursor.execute('''
            INSERT INTO "AssignmentBus" (
                "id_assignment_bus", "workerRut", "busId", "fecha", "trayecto", "estado"
            ) VALUES (%s, %s, %s, %s, %s, %s);
        ''', (
            str(uuid4()), t, b_asig, fecha_actual, trayecto, 'asignado'
        ))

        cursor.execute('''
            INSERT INTO "AssignmentPlane" (
                "id_assignment_plane", "workerRut", "planeId", "fecha", "trayecto", "estado"
            ) VALUES (%s, %s, %s, %s, %s, %s);
        ''', (
            str(uuid4()), t, v_asig, fecha_actual, trayecto, 'asignado'
        ))

    conn.commit()
    print("Asignaciones guardadas correctamente.")
else:
    print("No se encontró una solución factible.")

print(f"Valor FO: {solver.ObjectiveValue():.2f}")
print(f"Promedio por trabajador: {solver.ObjectiveValue() / len(trabajadores):.2f}")
