def build_row(date, weather, ctx, pd):

    row = dict(ctx)

    date = pd.to_datetime(date)

    row["YEAR"] = date.year

    for m in range(1, 13):
        row[f"MONTH_{m}"] = 1 if date.month == m else 0

    season = get_season(date.month)

    for s in ["SUMMER", "AUTUMN", "WINTER", "SPRING"]:
        row[f"SEASON_{s}"] = 1 if s == season else 0

    row["METEO_TEMP"] = weather["temperature"]
    row["METEO_VENTE_VITESSE"] = weather["wind_speed"]

    wind_dirs = weather["wind_direction"].split("+")

    all_dirs = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"]

    for d in all_dirs:
        row[f"WIND_{d}"] = 1 if d in wind_dirs else 0

    df = pd.DataFrame([row])

    return df


def get_season(month):
    if month in [3, 4, 5]:
            return 'SPRING'
    elif month in [6, 7, 8]:
            return 'SUMMER'
    elif month in [9, 10, 11]:
            return 'AUTUMN'
    else:
            return 'WINTER'