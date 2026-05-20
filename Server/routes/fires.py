from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from utils.db import get_fires, create_fire, get_fire_stats

fires_bp = Blueprint('fires', __name__, url_prefix='/api/fires')


@fires_bp.route('', methods=['GET'])
@jwt_required()
def list_fires():
    search = request.args.get('search', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 50))

    fires, total = get_fires(search, date_from, date_to, page, per_page)
    return jsonify({'fires': fires, 'total': total, 'page': page, 'per_page': per_page})


@fires_bp.route('', methods=['POST'])
@jwt_required()
def add_fire():
    data = request.json or {}
    if not data.get('forest_name') or not data.get('fire_date'):
        return jsonify({'error': 'forest_name and fire_date are required'}), 400

    claims = get_jwt()
    user_id = int(claims.get('sub', 0)) if claims.get('sub') else None
    fid = create_fire(data, user_id)
    return jsonify({'id': fid, 'message': 'Fire added successfully'}), 201


@fires_bp.route('/stats', methods=['GET'])
@jwt_required()
def fire_stats():
    stats = get_fire_stats()
    return jsonify(stats)
