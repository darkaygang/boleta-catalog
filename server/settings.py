"""Editable site defaults. Commercial terms remain explicit, never fabricated."""
DEFAULT_SETTINGS = {
    "brand": {"name": "BOLETA", "accent": "#60328A", "logo": "/images/boleta-logo.webp"},
    "hero": {"eyebrow": "ARCHIVO 001 / EST. 2022", "title": "PIEZAS CON CARÁCTER.", "description": "Accesorios reales para una generación propia.", "cta": "Ver piezas", "image": "/images/hero-glasses.webp", "secondary_image": "/images/hero-ring.webp", "backdrop": "/images/hero-chrome-backdrop.webp"},
    "fonts": {"heading": "Barlow Condensed", "body": "Manrope", "hero": "Georgia"},
    "copy": {
        "radio_title": "BOLETA RADIO", "radio_description": "SONIDOS PARA UN MUNDO DIFERENTE.",
        "how_eyebrow": "SIN VUELTAS / ASÍ FUNCIONA", "how_title": "TU ESTILO.\nTU SELECCIÓN.",
        "how_step1_title": "Encuentra tu pieza", "how_step1_text": "Explora el archivo y revisa las fotos y variantes.",
        "how_step2_title": "Arma tu selección", "how_step2_text": "Escoge talla o variante y añade lo que va contigo.",
        "how_step3_title": "Conversemos", "how_step3_text": "Confirma disponibilidad, entrega y condiciones por WhatsApp antes de pagar.",
        "community_eyebrow": "NO TE PIERDAS EL SIGUIENTE ARCHIVO.", "community_title": "QUÉDATE EN\nLA FRECUENCIA.",
        "community_description": "Déjanos tu contacto para responder tu consulta. Tú decides si también quieres novedades.",
        "archive_title": "TU PRÓXIMA\nPIEZA.", "archive_description": "Encuentra lo que va contigo. Arma tu selección y hablamos.",
    },
    "site_sections": {"order": ["catalog", "radio", "categories", "studio", "how", "faq", "community"], "hidden": []},
    "logistics": {"label": "Por encargo", "estimated_arrival": "2026-12-15", "note": "Llegada estimada, sujeta a logística."},
    "contacts": {"store_whatsapp": "584245314215", "studio_whatsapp": "573215885381"},
    "radio": {"playlist_url": "https://open.spotify.com/playlist/7JwsCKwcOZGfaWoJu8guQn"},
    "studio": {"title": "TU NEGOCIO. OTRA DIMENSIÓN.", "description": "Webs, automatización y experiencias digitales por Digital Solution.", "cta": "Hablemos de tu proyecto", "url": "https://digital-solution-page.vercel.app", "logo": "/images/digital-solution-logo.webp"},
    "faq": [{"question": "¿Cómo encargar?", "answer": "Arma tu selección y consulta disponibilidad y condiciones por WhatsApp."}, {"question": "¿Cuándo llega?", "answer": "Llegada estimada el 15 de diciembre, sujeta a logística."}, {"question": "¿Cómo elijo mi talla?", "answer": "Consulta las medidas y confírmalas por WhatsApp antes de encargar."}],
    "payment": {"deposit_percent": None, "bcv_rate": None, "bcv_date": ""},
    "rewards": {"enabled": False, "terms": "", "prizes": []},
}
ALLOWED_FONTS = {"Arial", "Arial Black", "Helvetica", "Georgia", "Courier New", "Impact", "Verdana", "Trebuchet MS", "system-ui", "Manrope", "DM Mono", "Barlow Condensed"}
