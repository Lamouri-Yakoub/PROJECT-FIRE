import joblib
import os
import json


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

