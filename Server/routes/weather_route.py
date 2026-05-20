from flask import Blueprint, jsonify
import requests

weather_bp = Blueprint('weather', __name__, url_prefix='/api/weather')

LAT = 36.4621
LON = 7.4261


@weather_bp.route('/current', methods=['GET'])
def get_current_weather():
    """Get current weather from Open-Meteo forecast API."""
    try:
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={LAT}"
            f"&longitude={LON}"
            "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation"
            "&timezone=Africa%2FAlgiers"
        )
        response = requests.get(url, timeout=10)
        data = response.json()

        current = data.get('current', {})

        return jsonify({
            'temperature': current.get('temperature_2m', 0),
            'humidity': current.get('relative_humidity_2m', 0),
            'wind_speed': current.get('wind_speed_10m', 0),
            'wind_direction': current.get('wind_direction_10m', 0),
            'precipitation': current.get('precipitation', 0),
            'latitude': LAT,
            'longitude': LON
        })

    except Exception as e:
        return jsonify({
            'temperature': 28,
            'humidity': 45,
            'wind_speed': 12,
            'wind_direction': 180,
            'precipitation': 0,
            'latitude': LAT,
            'longitude': LON,
            'fallback': True
        })
