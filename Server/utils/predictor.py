from datetime import datetime, timezone
import requests
from collections import Counter
import pandas as pd
from utils.enginering import build_row

from utils.store import (
    get_model,
    get_features,
    get_forest_context,
    weather_cache,
    save_cache,
)




def predict_top_forests(date, weather):

    date, weather = normalize_entries(date, weather)

    rows = []

    for forest in get_forest_context().index:
        ctx = get_forest_context().loc[forest]
        row = build_row(date, weather, ctx, pd)
        rows.append(row)

    df_all = pd.concat(rows, ignore_index=True)

    df_all = align_features(df_all, get_features())

    probs = get_model().predict_proba(df_all)[:, 1]

    results = []

    for i, forest in enumerate(get_forest_context().index):
        if(probs[i] >=0.5):
            ctx = get_forest_context().loc[forest]
            results.append({
                "forest": forest,
                "daira": ctx.get("DAIRA"),
                "commune": ctx.get("COMMUNE"),
                "risk": float(probs[i])
            })

    results.sort(key=lambda x: x["risk"], reverse=True)
    #> 4
    return results


def predict_forest(forest, date=None, weather=None):

    date, weather = normalize_entries(date, weather)

    if forest is None:
        raise ValueError("Forest is required")

    if forest not in get_forest_context().index:
        raise ValueError(f"No Data available for '{forest}' at the moment.")

    ctx = get_forest_context().loc[forest]

    row = build_row(date, weather, ctx, pd)
    row = align_features(row, get_features())

    proba = get_model().predict_proba(row)[0, 1]

    return {
        "forest": forest,
        "daira": ctx.get("DAIRA"),
        "commune": ctx.get("COMMUNE"),
        "risk": float(proba),
    }

def align_features(df, features):
    return df.reindex(columns=features, fill_value=0)

def get_daily_weather(date):

    url = (
        "https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={36.4621}"
        f"&longitude={7.4261}"
        f"&start_date={date}"
        f"&end_date={date}"
        "&hourly=temperature_2m,wind_speed_10m,wind_direction_10m"
        "&timezone=Europe%2FLondon"
    )

    response = requests.get(url)
    data = response.json()

    #print(data)
    hourly = data["hourly"]
    temperatures = hourly["temperature_2m"]
    wind_speeds = hourly["wind_speed_10m"]
    wind_directions = hourly["wind_direction_10m"]

    # averages
    avg_temp = round(sum(temperatures) / len(temperatures), 2)
    avg_wind_speed = round(sum(wind_speeds) / len(wind_speeds), 2)

    # convert hourly directions

    final_direction = compute_wind_direction(wind_directions)

    weather = {
    "temperature": float(avg_temp),
    "wind_speed": float(avg_wind_speed),
    "wind_direction": str(final_direction)
    }

    return weather


def get_cached_weather(date):

    if date in weather_cache:
        return weather_cache[date]

    weather = get_daily_weather(date)

    weather_cache[date] = weather
    save_cache()

    return weather




def compute_wind_direction(wind_directions):

    cardinal_dirs = [
        degrees_to_direction(d)
        for d in wind_directions
    ]

    counts = Counter(cardinal_dirs)
    top_dirs = counts.most_common()

    if len(top_dirs) == 1:
        return top_dirs[0][0]

    first_dir, first_count = top_dirs[0]
    second_dir, second_count = top_dirs[1]

    if second_count >= first_count * 0.7:
        return f"{first_dir}+{second_dir}"
    
    return first_dir


def degrees_to_direction(deg):

    sectors = [
        (22.5, "N"),
        (67.5, "NE"),
        (112.5, "E"),
        (157.5, "SE"),
        (202.5, "S"),
        (247.5, "SO"),
        (292.5, "O"),
        (337.5, "NO"),
        (360, "N")
    ]

    for limit, direction in sectors:
        if deg < limit:
            return direction
        

def normalize_entries(date, weather):

    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if isinstance(date, datetime):
        date = date.strftime("%Y-%m-%d")

    if weather is None:
        weather = get_cached_weather(date)

    return date, weather