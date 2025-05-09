import requests


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
                "codigo_vuelo": f'H2 {segmento["flight"]["flightNumber"]}',
                "origen": segmento["origin"],
                "destino": segmento["destination"],
                "fecha_salida": segmento["departure"].split("T")[0],
                "hora_salida": segmento["departure"].split("T")[1],
                "hora_llegada": segmento["arrival"].split("T")[1],
                "duracion_minutos": segmento["duration"],
                "precio_total_clp": None,  # Lo sacamos más abajo
                "directo": len(paradas) == 0,
                "paradas": paradas,
                "asientos_disponibles": itinerario["seatsRemaining"]["count"]
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