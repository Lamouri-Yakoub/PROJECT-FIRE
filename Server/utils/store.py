import joblib
import os
import json
import hashlib

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

ASSETS_DIR = os.path.join(BASE_DIR, "..", "assets")

# MODEL
model = None

# FEATURES
features = None

# FOREST CONTEXT
forest_context = None

# WEATHER CACHE
weather_cache_file = os.path.join(ASSETS_DIR, "weather_cache.json")

def get_model():
    global model

    if model is None:
        model = joblib.load(os.path.join(ASSETS_DIR, "model.pkl"))

    return model

def get_features():
    global features

    if features is None:
        features = joblib.load(os.path.join(ASSETS_DIR, "features.pkl"))

    return features

def get_forest_context():
    global forest_context

    if forest_context is None:
        forest_context = joblib.load(os.path.join(ASSETS_DIR, "forest_context.pkl")).set_index("FORET")

    return forest_context

if os.path.exists(weather_cache_file):
    with open(weather_cache_file, "r") as f:
        weather_cache = json.load(f)
else:
    weather_cache = {}


def save_cache():
    with open(weather_cache_file, "w") as f:
        json.dump(weather_cache, f)

def save_forest_context(forest_context=None):

    joblib.dump(
        forest_context.reset_index() if forest_context is not None else get_forest_context().reset_index(),
        os.path.join(ASSETS_DIR, "forest_context.pkl")
    )

KNOWN_COORDS = {
    "MAHOUNA": (36.45, 7.43),
    "BENI SALAH": (36.46, 7.71),
    "DJ DEBAGH": (36.47, 7.23),
    "DJ HALOUF": (36.5, 7.35),
    "EL MINA": (36.3, 7.17),
    "FEKIRINA": (36.41, 7.55),
    "SILA": (36.44, 7.4),
    "RAGOUBA": (36.48, 7.68),
    "OUED FRAGHA": (36.42, 7.48),
    "MOUBIA": (36.52, 7.3),
}

def get_forest_coordinates(forest_name):
    if forest_name in KNOWN_COORDS:
        return KNOWN_COORDS[forest_name]
    
    h = hashlib.md5(forest_name.encode()).hexdigest()
    lat = 36.20 + (int(h[:8], 16) % 6000) / 10000.0
    lon = 7.00 + (int(h[8:16], 16) % 8000) / 10000.0
    return round(lat, 5), round(lon, 5)
