import uuid
import sys
from fake_useragent import UserAgent
import random
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[2])) 
from scripts.scraper.utils.search_token_extractor import obtener_search_token

def get_latam_headers(origen: str, destino:str, fecha: str, adultos: int = 1):
    accept_languages = [
        "es-CL,es;q=0.9,en;q=0.8",
        "es-419,es;q=0.9,en-US;q=0.8",
        "en-US,en;q=0.9,es-ES;q=0.8"
    ]
    search_token = obtener_search_token(origen, destino, fecha)
    ua = UserAgent()
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
        "Accept-Language": random.choice(accept_languages),
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": ua.random,
        "Referer": f"https://www.latamairlines.com/cl/es/ofertas-vuelos?origin={origen}&outbound={fecha}T00%3A00%3A00.000Z&destination={destino}&inbound=null&adt={adultos}&chd=0&inf=0&trip=OW&cabin=Economy&redemption=false&sort=RECOMMENDED",
        "Origin": "https://www.latamairlines.com"
    }
    return headers

