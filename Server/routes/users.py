from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
import bcrypt
from utils.db import get_users, find_user_by_id, update_user, delete_user

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('', methods=['GET'])
@jwt_required()
def list_users():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    return jsonify({'users': get_users()})


@users_bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user_route(user_id):
    data = request.json or {}
    claims = get_jwt()
    identity = claims.get('sub')

    if str(user_id) != str(identity) and claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    fields = {k: data[k] for k in ['username', 'email', 'language'] if k in data}
    if not fields:
        return jsonify({'error': 'No fields to update'}), 400

    update_user(user_id, fields)
    return jsonify({'message': 'User updated successfully'})


@users_bp.route('/<int:user_id>/password', methods=['PUT'])
@jwt_required()
def change_password(user_id):
    data = request.json or {}
    claims = get_jwt()

    if str(user_id) != str(claims.get('sub')):
        return jsonify({'error': 'Unauthorized'}), 403

    old_password = data.get('old_password', '')
    new_password = data.get('new_password', '')

    if not old_password or not new_password:
        return jsonify({'error': 'Both passwords required'}), 400

    user = find_user_by_id(user_id)
    if not user or not bcrypt.checkpw(old_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'error': 'Current password is incorrect'}), 401

    new_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    update_user(user_id, {'password_hash': new_hash})
    return jsonify({'message': 'Password changed successfully'})


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user_route(user_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403
    delete_user(user_id)
    return jsonify({'message': 'User deleted'})
