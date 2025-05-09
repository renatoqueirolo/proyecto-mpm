import json
from pathlib import Path
import pandas as pd
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[2]))  
from scripts.scraper.latam_scraper import obtener_vuelos_latam
from scripts.scraper.sky_scraper import obtener_vuelos_sky



output_dir = Path(__file__).parent / "output"
output_dir.mkdir(exist_ok=True, parents=True)


origen = "SCL"
destino = "ANF"
fecha = "2025-05-09"
vuelos_latam = obtener_vuelos_latam(origen=origen, destino=destino, fecha=fecha)
vuelos_sky = obtener_vuelos_sky(origen=origen, destino=destino, fecha=fecha)

# 2. Guardar cada uno
(output_dir / "vuelos_latam.json").write_text(json.dumps(vuelos_latam, indent=2, ensure_ascii=False))
(output_dir / "vuelos_sky.json").write_text(json.dumps(vuelos_sky, indent=2, ensure_ascii=False))

# 3. Unificar resultados
vuelos = vuelos_latam + vuelos_sky
vuelos.sort(key=lambda v: (v["fecha_salida"], v["hora_salida"]))

# 4. Formatear resumen
def generar_resumen(vuelos):
    resumen = []
    for v in vuelos:
        resumen.append({
            "Aerolínea": v.get("aerolinea", "").title(),
            "Código Vuelo": v["codigo_vuelo"],
            "Ruta": f'{v["origen"]} → {v["destino"]}',
            "Salida": f'{v["fecha_salida"]} {v["hora_salida"]}',
            "Llegada": v["hora_llegada"],
            "Duración (min)": v["duracion_minutos"],
            "Tipo": "Directo" if v["directo"] else f'{len(v["paradas"])} escala(s)',
            "Precio CLP": v["precio_total_clp"],
            "Asientos Disponibles": v["asientos_disponibles"]
        })
    return pd.DataFrame(resumen)

# 5. Exportar CSV final
df_latam = generar_resumen(vuelos_latam)
df_sky = generar_resumen(vuelos_sky)

excel_path = output_dir / "resumen_vuelos.xlsx"

with pd.ExcelWriter(excel_path, engine="xlsxwriter") as writer:
    df_latam.to_excel(writer, sheet_name="Latam", index=False)
    df_sky.to_excel(writer, sheet_name="Sky", index=False)

print(f"✅ Excel generado en: {excel_path}")
