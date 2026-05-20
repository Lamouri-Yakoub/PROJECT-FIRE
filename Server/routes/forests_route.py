import hashlib
import pandas as pd
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from utils.store import get_forest_context, get_forest_coordinates

forests_bp = Blueprint('forests', __name__, url_prefix='/api/forests')

@forests_bp.route('', methods=['GET'])
@jwt_required()
def list_forests():
    """Return all forests with coordinates and context data."""
    ctx = get_forest_context()
    forests = []

    for forest_name in ctx.index:
        row = ctx.loc[forest_name]
        lat, lon = get_forest_coordinates(forest_name)
        
        fc = row.get('FORET_FIRE_COUNT')
        fire_count = 0 if pd.isna(fc) else int(fc)
        
        group = row.get('FORET_GROUP', 'WEAK')
        group = 'WEAK' if pd.isna(group) else group
        
        daira = row.get('DAIRA', '')
        daira = '' if pd.isna(daira) else daira
        
        commune = row.get('COMMUNE', '')
        commune = '' if pd.isna(commune) else commune

        forests.append({
            'name': forest_name,
            'daira': daira,
            'commune': commune,
            'latitude': lat,
            'longitude': lon,
            'fire_count': fire_count,
            'group': group,
        })

    return jsonify({'forests': forests})


@forests_bp.route('/<path:name>', methods=['GET'])
@jwt_required()
def get_forest(name):
    """Get details for a specific forest."""
    ctx = get_forest_context()

    if name not in ctx.index:
        return jsonify({'error': f"Forest '{name}' not found"}), 404

    row = ctx.loc[name]
    lat, lon = get_forest_coordinates(name)
    
    fc = row.get('FORET_FIRE_COUNT')
    st = row.get('SURF_TOTAL')
    
    return jsonify({
        'name': name,
        'daira': '' if pd.isna(row.get('DAIRA')) else row.get('DAIRA'),
        'commune': '' if pd.isna(row.get('COMMUNE')) else row.get('COMMUNE'),
        'latitude': lat,
        'longitude': lon,
        'fire_count': 0 if pd.isna(fc) else int(fc),
        'group': 'WEAK' if pd.isna(row.get('FORET_GROUP')) else row.get('FORET_GROUP'),
        'daira_group': 'WEAK' if pd.isna(row.get('DAIRA_GROUP')) else row.get('DAIRA_GROUP'),
        'commune_group': 'WEAK' if pd.isna(row.get('COMMUNE_GROUP')) else row.get('COMMUNE_GROUP'),
        'surface_total': 0.0 if pd.isna(st) else float(st),
    })
