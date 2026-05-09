from flask import Blueprint, request, jsonify
from utils.predictor import predict_top_forests

predict_bp = Blueprint("predict", __name__)

@predict_bp.route("/predict_top", methods=["POST"])
def predict():
    try:
        data = request.json
        date = data.get("date") #optional

        weather = data.get("weather")  # optional

        results = predict_top_forests(date, weather)

        return jsonify(results)
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400