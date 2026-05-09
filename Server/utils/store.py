import joblib
import os
import json

# MODEL
model = joblib.load("assets/model.pkl")


# FEATURES
features = joblib.load("assets/features.pkl")

# FOREST CONTEXT
forest_context = joblib.load(
    "assets/forest_context.pkl"
)

forest_context = forest_context.set_index("FORET")

# WEATHER CACHE
weather_cache_file = "assets/weather_cache.json"

if os.path.exists(weather_cache_file):
    with open(weather_cache_file, "r") as f:
        weather_cache = json.load(f)
else:
    weather_cache = {}


def save_cache():
    with open(weather_cache_file, "w") as f:
        json.dump(weather_cache, f)

def save_forest_context():

    joblib.dump(
        forest_context.reset_index(),
        "assets/forest_context.pkl"
    )

