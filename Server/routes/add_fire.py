from flask import Blueprint, request, jsonify
from utils.adder import add_fire

add_fire_bp = Blueprint("add_fire", __name__)

@add_fire_bp.route("/add_fire", methods=["POST"])
def add_fire_route():
    try:
        data = request.json
        
        fire = data.get("fire")

        message = add_fire(fire)

        return jsonify(message)
    
    except ValueError as e:
        return jsonify({"error": str(e)}), 400