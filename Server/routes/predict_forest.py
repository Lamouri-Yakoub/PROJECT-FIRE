from flask import Blueprint, request, jsonify
from utils.predictor import predict_forest

predict_forest_bp = Blueprint("predict_forest", __name__)

@predict_forest_bp.route("/predict_forest", methods=["POST"])
def predict_forest_route():
    try:
        data = request.json
        
        forest = data.get("forest")

        date = data.get("date") #optional

        weather = data.get("weather")  # optional

        results = predict_forest(forest, date, weather)

        return jsonify(results)
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400