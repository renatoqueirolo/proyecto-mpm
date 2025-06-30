import requests
import re


def obtener_build_id_latam(origen: str, destino: str, fecha: str):
    url = "https://www.latamairlines.com/es-cl/flights/"
    headers = {
        "Accept": "*/*",
        "Accept-Language": "es-419,es;q=0.9,es-ES;q=0.8,en;q=0.7,en-GB;q=0.6,en-US;q=0.5,it;q=0.4,es-CL;q=0.3",
        "Priority": "u=1, i",
        "Referer": f"https://www.latamairlines.com/cl/es/ofertas-vuelos?origin={origen}&outbound={fecha}T00%3A00%3A00.000Z&destination={destino}&inbound=null&adt=1&chd=0&inf=0&trip=OW&cabin=Economy&redemption=false&sort=RECOMMENDED",
        "Sec-CH-UA": '"Microsoft Edge";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0"
    }

    response = requests.get(url, headers=headers, timeout=30)

    if response.status_code != 200:
        raise Exception(f"Error cargando página de LATAM: {response.status_code}")

    html = response.text
    # Guardar el HTML en un archivo para depuración
    with open("latam_page.html", "w", encoding="utf-8") as f:
        f.write(html)

    # Buscar el build_id
    match = re.search(r'_next/static/([^/]+)/_buildManifest.js', html)
    if match:
        build_id = match.group(1)
        return build_id
    else:
        raise Exception("No se pudo encontrar el build_id automáticamente.")
