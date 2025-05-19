from datetime import datetime
import requests
import time
import random
import sys
from fake_useragent import UserAgent
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[2])) 

from scripts.scraper.utils.get_latam_headers import get_latam_headers



def obtener_vuelos_latam(origen, destino, fecha):
    def clave(v):
        return (v["codigo_vuelo"], v["hora_salida"])

    vuelos_base = obtener_vuelos_latam_particular(origen, destino, fecha, adultos=1)
    vuelos_dict = {clave(v): v for v in vuelos_base}
    capacidades = {k: None for k in vuelos_dict}

    vuelos_pendientes = set(capacidades.keys())

    for adultos in range(9, 1, -1):
        vuelos = obtener_vuelos_latam_particular(origen, destino, fecha, adultos=adultos)
        claves_actuales = set(clave(v) for v in vuelos)

        for k in list(vuelos_pendientes):
            if k in claves_actuales:
                capacidades[k] = adultos
                vuelos_pendientes.remove(k)

        if not vuelos_pendientes:
            break

    # Armar resultado final
    resultado = []
    for k, cap in capacidades.items():
        vuelo = vuelos_dict[k]
        vuelo["asientos_disponibles"] = cap if cap is not None else 1
        resultado.append(vuelo)

    return resultado


def obtener_vuelos_latam_particular(origen: str, destino: str, fecha: str, adultos: int = 1):
    
    # Método para consultar directamente a LATAM Airlines

    url = f"https://www.latamairlines.com/bff/air-offers/v2/offers/search?inOfferId=null&destination={destino}&inFrom=null&sort=RECOMMENDED&redemption=false&cabinType=Economy&outOfferId=null&outFlightDate=null&origin={origen}&adult={adultos}&infant=0&inFlightDate=null&child=0&outFrom={fecha}"
    headers = get_latam_headers(origen, destino, fecha, adultos)
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"⚠️ Error en consulta Latam: {response.status_code}")
        print(response.text)
        return []

    data = response.json()

    vuelos = []

    # Recorrer los vuelos del JSON
    for vuelo in data.get("content", []):
        summary = vuelo.get("summary", {})
        itinerary = vuelo.get("itinerary", [])
        new_prices = vuelo.get("newPrices", [])

        # Datos base
        numero_vuelo = summary.get("flightCode", "")
        origen_info = summary.get("origin", {})
        destino_info = summary.get("destination", {})
        duracion_minutos = summary.get("duration", 0)
        cantidad_paradas = summary.get("stopOvers", 0)

        # Tiempos
        fecha_salida, hora_salida = obtener_fecha_hora(origen_info.get("departure", ""))
        fecha_llegada, hora_llegada = obtener_fecha_hora(destino_info.get("arrival", ""))

        # Aeropuertos
        aeropuerto_origen = origen_info.get("iataCode", "")
        aeropuerto_destino = destino_info.get("iataCode", "")

        # Escalas
        paradas = []
        if cantidad_paradas > 0 and len(itinerary) > 1:
            for i in range(1, len(itinerary)):
                escala = {}
                escala["aeropuerto"] = itinerary[i]["origin"]

                # Duración de escala: restar departure actual - arrival anterior
                arrival_anterior = itinerary[i-1]["arrival"]
                departure_actual = itinerary[i]["departure"]

                fmt = "%Y-%m-%dT%H:%M:%S"
                arrival_dt = datetime.strptime(arrival_anterior, fmt)
                departure_dt = datetime.strptime(departure_actual, fmt)

                duracion_escala = int((departure_dt - arrival_dt).total_seconds() / 60)
                escala["duracion_minutos"] = duracion_escala

                paradas.append(escala)

        # Precio: tomar siempre el primero de newPrices
        precio_total = None
        if new_prices and new_prices[0]:
            precio_total = new_prices[0].get("total", None)

        vuelo_info = {
            "aerolinea": "Latam Airlines",
            "codigo_vuelo": numero_vuelo,
            "origen": aeropuerto_origen,
            "destino": aeropuerto_destino,
            "fecha_salida": fecha_salida,
            "hora_salida": hora_salida,
            "hora_llegada": hora_llegada,
            "duracion_minutos": duracion_minutos,
            "precio_total_clp": precio_total,
            "directo": cantidad_paradas == 0,
            "paradas": paradas
        }

        vuelos.append(vuelo_info)

    return vuelos


def obtener_fecha_hora(datetime_str):
    if "T" in datetime_str:
        fecha, hora = datetime_str.split("T")
        return fecha, hora
    return None, None