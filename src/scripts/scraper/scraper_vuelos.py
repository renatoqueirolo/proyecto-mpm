import json
import argparse
from typing import List, Dict
from pathlib import Path
import sys
sys.path.append(str(Path(__file__).resolve().parents[2]))  
from scripts.scraper.latam_scraper import obtener_vuelos_latam
from scripts.scraper.sky_scraper import obtener_vuelos_sky

def parse_args():
    parser = argparse.ArgumentParser(
        description="Scraper de vuelos Latam + Sky: devuelve JSON unificado."
    )
    parser.add_argument(
        "--origen", required=True, help="Código IATA de origen, e.g. SCL"
    )
    parser.add_argument(
        "--destino", required=True, help="Código IATA de destino, e.g. LIM"
    )
    parser.add_argument(
        "--fecha", required=True, help="Fecha de vuelo en formato YYYY-MM-DD"
    )
    return parser.parse_args()

def normalize_raw_flight(v: Dict) -> Dict:
    fecha_str = v.get("fecha_salida")
    hora_salida = v.get("hora_salida")
    hora_llegada = v.get("hora_llegada")

    departure_date_iso = fecha_str
    departure_time_iso = f"{fecha_str}T{hora_salida}:00"
    arrival_time_iso = f"{fecha_str}T{hora_llegada}:00"

    paradas = v.get("paradas", [])
    stops_count = len(paradas)

    return {
        "airline":        v.get("aerolinea", "").strip().title(),
        "flightCode":     v.get("codigo_vuelo", "").strip(),
        "origin":         v.get("origen", "").strip(),
        "destination":    v.get("destino", "").strip(),
        "departureDate":  departure_date_iso,
        "departureTime":  departure_time_iso,
        "arrivalTime":    arrival_time_iso,
        "durationMinutes": int(v.get("duracion_minutos", 0)),
        "priceClp":       int(v.get("precio_total_clp", 0)),
        "direct":         bool(v.get("directo", False)),
        "stops":          stops_count,
        "stopsDetail":    paradas,
        "seatsAvailable": int(v.get("asientos_disponibles", 0))
    }


def main():
    args = parse_args()

    origen = args.origen
    destino = args.destino
    fecha  = args.fecha

    # 1. Llamar a cada scraper y capturar errores
    try:
        vuelos_latam_raw = obtener_vuelos_latam(origen=origen, destino=destino, fecha=fecha)
    except Exception as e:
        print(f"⚠️ Error en scraper Latam: {e}", file=sys.stderr)
        vuelos_latam_raw = []

    try:
        vuelos_sky_raw = obtener_vuelos_sky(origen=origen, destino=destino, fecha=fecha)
    except Exception as e:
        print(f"⚠️ Error en scraper Sky: {e}", file=sys.stderr)
        vuelos_sky_raw = []

    # 2. Si ambos scrapers no devolvieron datos, error
    if not vuelos_latam_raw and not vuelos_sky_raw:
        print("Error: ambos scrapers Latam y Sky fallaron o no devolvieron datos.", file=sys.stderr)
        sys.exit(1)

    # 3. Normalizar cada lista
    normalizados: List[Dict] = []
    for v in vuelos_latam_raw:
        normalizados.append(normalize_raw_flight(v))
    for v in vuelos_sky_raw:
        normalizados.append(normalize_raw_flight(v))

    # 4. (Opcional) ordenar por departureTime
    normalizados.sort(key=lambda x: x["departureTime"])

    # 5. Imprimir por stdout el JSON unificado
    print(json.dumps(normalizados, ensure_ascii=False))

if __name__ == "__main__":
    main()
# 