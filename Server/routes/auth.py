from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
import bcrypt
from utils.db import find_user, create_user

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username', '')
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user = find_user(username)

    if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = create_access_token(
        identity=str(user['id']),
        additional_claims={
            'username': user['username'],
            'role': user['role'],
            'email': user.get('email', '')
        }
    )

    return jsonify({
        'token': token,
        'user': {
            'id': user['id'],
            'username': user['username'],
            'email': user.get('email', ''),
            'role': user['role'],
            'language': user.get('language', 'fr')
        }
    })


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json or {}
    username = data.get('username', '')
    email = data.get('email', '')
    password = data.get('password', '')

    if not all([username, email, password]):
        return jsonify({'error': 'All fields are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if find_user(username):
        return jsonify({'error': 'Username already exists'}), 409

    pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user_id = create_user(username, email, pw_hash, 'user')

    token = create_access_token(
        identity=str(user_id),
        additional_claims={'username': username, 'role': 'user', 'email': email}
    )

    return jsonify({
        'token': token,
        'user': {'id': user_id, 'username': username, 'email': email, 'role': 'user', 'language': 'fr'}
    }), 201
