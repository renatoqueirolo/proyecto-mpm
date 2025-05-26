import requests
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[2]))  # apunta a raíz del proyecto
from scripts.scraper.utils.build_id_extractor import obtener_build_id_latam


def obtener_search_token(origen: str, destino: str, fecha: str):
    build_id = obtener_build_id_latam(origen, destino, fecha)  

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