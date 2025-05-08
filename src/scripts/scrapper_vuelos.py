from datetime import datetime
import requests
import json
# from pathlib import Path
import uuid

def obtener_vuelos_sky(origen: str, destino: str, fecha: str):
    url = "https://api.skyairline.com/farequoting/v1/search/flight?stage=IS"

    headers = {
        "ocp-apim-subscription-key": "4c998b33d2aa4e8aba0f9a63d4c04d7d",
        "Content-Type": "application/json"
    }

    payload = {
        "cabinClass": "Economy",
        "currency": None,
        "awardBooking": False,
        "pointOfSale": "CL",
        "searchType": "BRANDED",
        "itineraryParts": [{
            "origin": {"code": origen, "useNearbyLocations": False},
            "destination": {"code": destino, "useNearbyLocations": False},
            "departureDate": {"date": fecha},
            "selectedOfferRef": None,
            "plusMinusDays": None
        }],
        "passengers": {
            "ADT": 1,
            "CHD": 0,
            "INF": 0,
            "PET": 0
        },
        "trendIndicator": None,
        "preferredOperatingCarrier": None
    }

    response = requests.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"⚠️ Error en consulta Sky: {response.status_code}")
        print(response.text)
        return []

    data = response.json()

    vuelos = []

    for itinerario in data.get("itineraryParts", [[]])[0]:
        for segmento in itinerario.get("segments", []):
            stop_airports = segmento["flight"].get("stopAirports", [])
            paradas = []
            for parada in stop_airports:
              paradas.append({
                "aeropuerto": parada["airport"],
                "duracion_escala": parada.get("duration", 0)  # algunos objetos no tienen duración
              })
            vuelo_info = {
                "aerolinea": "Sky Airline",
                "codigo_vuelo": segmento["flight"]["flightNumber"],
                "origen": segmento["origin"],
                "destino": segmento["destination"],
                "fecha_salida": segmento["departure"].split("T")[0],
                "hora_salida": segmento["departure"].split("T")[1],
                "hora_llegada": segmento["arrival"].split("T")[1],
                "duracion_minutos": segmento["duration"],
                "precio_total_clp": None,  # Lo sacamos más abajo
                "asientos_disponibles": itinerario["seatsRemaining"]["count"],
                "directo": len(paradas) == 0,
                "paradas": paradas
            }

            # Buscar el precio más barato disponible
            precios = []
            for fare in itinerario.get("fares", []):
                if fare.get("status", False):
                    precios.append(fare["total"]["amount"])
            if precios:
                vuelo_info["precio_total_clp"] = min(precios)

            vuelos.append(vuelo_info)

    return vuelos


def obtener_search_token(origen: str, destino: str, fecha: str):
    build_id = "peUUmlN5MeV8r74FC9eoe"  # Este es el que encontraste; si cambia hay que actualizarlo manualmente

    url = f"https://www.latamairlines.com/es-cl/flights/_next/data/{build_id}/es-cl/flights.json"
    params = {
        "origin": origen,
        "outbound": f"{fecha}T00%3A00%3A00.000Z",
        "destination": destino,
        "inbound": "null",
        "adt": 1,
        "chd": 0,
        "inf": 0,
        "trip": "OW",
        "cabin": "Economy",
        "redemption": "false",
        "sort": "RECOMMENDED",
        "locale": "es-cl"
    }
    headers = {
        "x-latam-application-country": "cl",
        "x-latam-application-lang": "es",
        "x-latam-application-oc": "cl",
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "es-CL,es;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
        "Referer": "https://www.latamairlines.com/es-cl/flights",
        "Origin": "https://www.latamairlines.com"
    }

    response = requests.get(url, headers=headers, params=params, timeout=30)

    if response.status_code != 200:
        raise Exception(f"Error obteniendo search token: {response.status_code}")

    data = response.json()
    search_token = data["pageProps"]["tokensToSearch"]["searchToken"]
    return search_token

def obtener_fecha_hora(datetime_str):
    if "T" in datetime_str:
        fecha, hora = datetime_str.split("T")
        return fecha, hora
    return None, None

def obtener_vuelos_latam(origen: str, destino: str, fecha: str):
    
    # Método para consultar directamente a LATAM Airlines

    url = f"https://www.latamairlines.com/bff/air-offers/v2/offers/search?inOfferId=null&destination={destino}&inFrom=null&sort=RECOMMENDED&redemption=false&cabinType=Economy&outOfferId=null&outFlightDate=null&origin={origen}&adult=1&infant=0&inFlightDate=null&child=0&outFrom={fecha}"

    search_token = obtener_search_token(origen, destino, fecha)

    headers = {
        "x-latam-app-session-id": str(uuid.uuid4()), 
        "x-latam-application-country": "CL",
        "x-latam-application-lang": "es",
        "x-latam-application-name": "web-air-offers",
        "x-latam-application-oc": "cl",
        "x-latam-client-name": "web-air-offers",
        "x-latam-request-id": str(uuid.uuid4()),
        "x-latam-search-token": search_token, 
        "x-latam-track-id": str(uuid.uuid4()),
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "es-CL,es;q=0.9",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
        "Referer": f"https://www.latamairlines.com/cl/es/ofertas-vuelos?origin={origen}&outbound={fecha}T00%3A00%3A00.000Z&destination={destino}&inbound=null&adt=1&chd=0&inf=0&trip=OW&cabin=Economy&redemption=false&sort=RECOMMENDED",
        "Origin": "https://www.latamairlines.com"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        print(f"⚠️ Error en consulta Latam: {response.status_code}")
        print(response.text)
        return []

    data = response.json()

    # # Leer el JSON local (mismo folder del script)
    # ruta_archivo = Path(__file__).parent / "latam.json"

    # with open(ruta_archivo, "r", encoding="utf-8") as f:
    #     data = json.load(f)

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

# Ejemplo:
if __name__ == "__main__":
    vuelos = obtener_vuelos_latam(origen="SCL", destino="CJC", fecha="2025-05-14")
    print(json.dumps(vuelos, indent=4, ensure_ascii=False))
    vuelos = obtener_vuelos_sky(origen="SCL", destino="CJC", fecha="2025-05-14")
    print(json.dumps(vuelos, indent=4, ensure_ascii=False))
