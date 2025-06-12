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
    """
    Recibe un dict v con claves en español (tal como las devuelve obtener_vuelos_latam/sky)
    y lo convierte a un dict con las claves normalizadas que espera el servicio Node.
    """

    # 1. Combinar fecha_salida + hora_salida para departureTime
    #    y usar solo "YYYY-MM-DD" para departureDate.
    #    Asumimos que v["fecha_salida"] = "2025-05-09" y v["hora_salida"] = "07:45"
    fecha_str = v.get("fecha_salida")                      # "2025-05-09"
    hora_salida = v.get("hora_salida")                     # "07:45"
    hora_llegada = v.get("hora_llegada")                   # "10:40"

    # Validar si los campos existen y son correctos
    if not fecha_str or not hora_salida or not hora_llegada:
        print(f"⚠️ Error: Faltan campos en el vuelo. Fecha salida: {fecha_str}, Hora salida: {hora_salida}, Hora llegada: {hora_llegada}")
    
    # Aquí, antes de devolver la respuesta, simplemente omite las líneas que imprimen datos de depuración
    return {
        "airline":        v.get("aerolinea", "").strip().title(),
        "flightCode":     v.get("codigo_vuelo", "").strip(),
        "origin":         v.get("origen", "").strip(),
        "destination":    v.get("destino", "").strip(),
        "departureDate":  fecha_str,
        "horario_salida":  str(hora_salida),
        "horario_llegada": str(hora_llegada),
        "durationMinutes": int(v.get("duracion_minutos", 0)),
        "priceClp":       int(v.get("precio_total_clp", 0)),
        "direct":         bool(v.get("directo", False)),
        "stops":          len(v.get("paradas", [])),
        "stopsDetail":    v.get("paradas", []), 
        "seatsAvailable": int(v.get("asientos_disponibles", 0))
    }


def main():
    args = parse_args()

    origen = args.origen
    destino = args.destino
    fecha  = args.fecha

    # 1. Llamar a cada scraper: producen listas de dicts con claves en español
    vuelos_latam_raw = obtener_vuelos_latam(origen=origen, destino=destino, fecha=fecha)
    vuelos_sky_raw   = obtener_vuelos_sky(origen=origen, destino=destino, fecha=fecha)

    # 2. Normalizar cada lista
    normalizados: List[Dict] = []
    for v in vuelos_latam_raw:
        normalizados.append(normalize_raw_flight(v))
    for v in vuelos_sky_raw:
        normalizados.append(normalize_raw_flight(v))

    # 3. (Opcional) ordenar por departureTime
    normalizados.sort(key=lambda x: x["horario_salida"])

    # 4. Imprimir por stdout el JSON unificado
    print(json.dumps(normalizados, ensure_ascii=False))


if __name__ == "__main__":
    main()
