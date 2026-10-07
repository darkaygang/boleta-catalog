import os
import sys
import json
import re
from analyze_messages import TelegramHTMLParser

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

def build_catalog():
    html_path = os.path.join("ChatExport_2026-10-06", "messages.html")
    with open(html_path, "r", encoding="utf-8") as f:
        content = f.read()

    parser = TelegramHTMLParser()
    parser.feed(content)

    products = []
    prod_counter = 1

    # Mapping based on verified chat export analysis
    # Group 1: Brazaletes Chrome Hearts (messages 1803 to 1812)
    # Group 2: Lentes Chrome Hearts standard (1814-1823) & exclusivos (1824-1849)
    # Group 3: Anillos Chrome Hearts (1851-1866)
    # Group 4: Maison Margiela (1867, 1868, 1870)
    # Group 5: Cadenas Chrome Hearts (1871-1883)
    # Group 6: Shorts Streetwear (1884-1924)
    # Group 7: Chains Silicona (1925-1926)
    # Group 8: iPhone Cases (1928-1941)
    # Group 9: Corteiz Top Tank (1943-1945)
    # Group 10: Forget Raven Cloth (1946-1955)
    # Group 11: Underwear PSD (1960)
    # Group 12: Jerseys de Fútbol (1961-1962)

    current_group = None
    
    # Process messages sequentially
    for msg in parser.messages:
        text = msg['text'].strip()
        photos = msg['photos']
        msg_id = msg['id']

        if not text and not photos:
            continue

        # Detect new product group headers
        if "Brazaletes Chrome Hearts" in text:
            current_group = {
                "category": "Joyería",
                "brand": "Chrome Hearts",
                "base_title": "Brazalete Chrome Hearts",
                "price_bcv": "35$ BCV",
                "price_usd": "30$ USD",
                "num_usd": 30,
                "material": "Acero + Plata 905",
                "sizes": ["Ajustable / Estándar"]
            }
        elif "Lentes Chrome Hearts" in text or "Modelos standard" in text:
            current_group = {
                "category": "Lentes",
                "brand": "Chrome Hearts",
                "base_title": "Lentes Chrome Hearts Standard",
                "price_bcv": "25$ BCV",
                "price_usd": "20$ USD",
                "num_usd": 20,
                "material": "Acetato premium & detalles metálicos",
                "sizes": ["Talla única"]
            }
        elif "Modelos Exclusivos" in text and ("30$ bcv" in text.lower() or "25$" in text):
            current_group = {
                "category": "Lentes",
                "brand": "Chrome Hearts",
                "base_title": "Lentes Chrome Hearts Exclusivos",
                "price_bcv": "30$ BCV",
                "price_usd": "25$ USD",
                "num_usd": 25,
                "material": "Armazón labrado & lunas UV400",
                "sizes": ["Talla única"]
            }
        elif "Anillos Chrome Hearts" in text:
            current_group = {
                "category": "Joyería",
                "brand": "Chrome Hearts",
                "base_title": "Anillo Chrome Hearts",
                "price_bcv": "20$ BCV",
                "price_usd": "18$ USD",
                "num_usd": 18,
                "material": "Acero + Plata 905",
                "sizes": ["Talla 7", "Talla 8", "Talla 9", "Talla 10", "Talla 11"]
            }
        elif "Maison Margiela Brazalete" in text:
            price_match = re.search(r'(\d+)\$\s*BCV', text, re.I)
            price_val = int(price_match.group(1)) if price_match else 35
            current_group = {
                "category": "Joyería",
                "brand": "Maison Margiela",
                "base_title": "Brazalete Maison Margiela Numbers",
                "price_bcv": f"{price_val}$ BCV",
                "price_usd": f"{price_val - 5}$ USD",
                "num_usd": price_val - 5,
                "material": "Acero de titanio",
                "sizes": ["Ajustable"]
            }
        elif "Maison Margiela Anillo" in text:
            current_group = {
                "category": "Joyería",
                "brand": "Maison Margiela",
                "base_title": "Anillo Maison Margiela Numeric",
                "price_bcv": "35$ BCV",
                "price_usd": "30$ USD",
                "num_usd": 30,
                "material": "Acero de titanio",
                "sizes": ["Talla 8", "Talla 9", "Talla 10"]
            }
        elif "Cadenas Chrome Hearts" in text:
            current_group = {
                "category": "Joyería",
                "brand": "Chrome Hearts",
                "base_title": "Cadena Chrome Hearts Gothic Cross",
                "price_bcv": "32$ BCV",
                "price_usd": "28$ USD",
                "num_usd": 28,
                "material": "Acero + Plata 905",
                "sizes": ["50 cm", "60 cm"]
            }
        elif "Shorts Eric Emanuel" in text:
            current_group = {
                "category": "Shorts",
                "brand": "Eric Emanuel / Streetwear",
                "base_title": "Shorts Mesh Streetwear",
                "price_bcv": "20$ BCV",
                "price_usd": "18$ USD",
                "num_usd": 18,
                "material": "Double-layer Polyester Mesh",
                "sizes": ["S", "M", "L", "XL"]
            }
        elif "Chrome hearts chain silicona" in text:
            current_group = {
                "category": "Accesorios",
                "brand": "Chrome Hearts",
                "base_title": "Chain Silicona Chrome Hearts",
                "price_bcv": "18$ BCV",
                "price_usd": "15$ USD",
                "num_usd": 15,
                "material": "Silicona grabada de alta resistencia",
                "sizes": ["Único"]
            }
        elif "Case Iphone" in text or ("Case" in text and "Bcv" in text):
            current_group = {
                "category": "Accesorios",
                "brand": "Designer Cases",
                "base_title": "Case iPhone Designer Series",
                "price_bcv": "15$ BCV",
                "price_usd": "12$ USD",
                "num_usd": 12,
                "material": "Cuero vegano / TPU anti-impacto",
                "sizes": ["iPhone 13", "iPhone 14", "iPhone 15", "iPhone 15 Pro", "iPhone 16 Pro"]
            }
        elif "Baby Milo Case" in text:
            current_group = {
                "category": "Accesorios",
                "brand": "BAPE / Baby Milo",
                "base_title": "Baby Milo Phone Case Bag",
                "price_bcv": "25$ BCV",
                "price_usd": "20$ USD",
                "num_usd": 20,
                "material": "Felpa premium & correa bandolera",
                "sizes": ["Universal"]
            }
        elif "Corteiz Top Tank" in text:
            current_group = {
                "category": "Prendas",
                "brand": "Corteiz",
                "base_title": "Corteiz Top Tank Guerrilla",
                "price_bcv": "25$ BCV",
                "price_usd": "22$ USD",
                "num_usd": 22,
                "material": "100% Algodón Ribbed",
                "sizes": ["S", "M", "L"]
            }
        elif "Forget Raven Cloth" in text:
            current_group = {
                "category": "Prendas",
                "brand": "Forget Raven",
                "base_title": "Forget Raven Heavyweight Tee",
                "price_bcv": "35$ BCV",
                "price_usd": "30$ USD",
                "num_usd": 30,
                "material": "Algodón 280 GSM lavado ácido",
                "sizes": ["M (Oversize)", "L (Oversize)", "XL (Oversize)"]
            }
        elif "PSD MAS DE 30 modelos" in text:
            current_group = {
                "category": "Prendas",
                "brand": "PSD Underwear",
                "base_title": "Boxer PSD Signature Collection",
                "price_bcv": "12$ BCV",
                "price_usd": "10$ USD",
                "num_usd": 10,
                "material": "Microfibra elástica transpirable",
                "sizes": ["M", "L", "XL"]
            }
        elif "VARIEDAD DE JERSEYS" in text:
            current_group = {
                "category": "Prendas",
                "brand": "Retro & Modern Jerseys",
                "base_title": "Jersey Fútbol Club / Selección (Quality 1.1)",
                "price_bcv": "30$ BCV",
                "price_usd": "25$ USD",
                "num_usd": 25,
                "material": "Dri-FIT / Poliéster deportivo",
                "sizes": ["S", "M", "L", "XL"]
            }

        # If this message has a photo and we have an active group, emit a product item
        if photos and current_group:
            for photo_rel in photos:
                # e.g. "photos/photo_559@29-09-2026_22-47-31.jpg"
                thumb_rel = photo_rel.replace(".jpg", "_thumb.jpg")
                prod_id = f"BOL-{prod_counter:03d}"
                prod_counter += 1

                # Clean photo name to generate variant model subtitle
                base_name = os.path.basename(photo_rel)
                model_idx = prod_counter - 1

                product = {
                    "id": prod_id,
                    "code": f"#{prod_id}",
                    "title": f"{current_group['base_title']} Mod. {model_idx}",
                    "category": current_group["category"],
                    "brand": current_group["brand"],
                    "price_bcv": current_group["price_bcv"],
                    "price_usd": current_group["price_usd"],
                    "numeric_usd": current_group["num_usd"],
                    "material": current_group["material"],
                    "sizes": current_group["sizes"],
                    "image": photo_rel,
                    "thumb": thumb_rel,
                    "tag": "Por encargo",
                    "source_msg": msg_id,
                    "status": "aprobado"
                }
                products.append(product)

    print(f"Total catalog products generated: {len(products)}")
    
    os.makedirs("data", exist_ok=True)
    out_path = os.path.join("data", "catalog.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(products, f, indent=2, ensure_ascii=False)

    print(f"Catalog saved to {out_path}")
    return products

if __name__ == "__main__":
    build_catalog()
