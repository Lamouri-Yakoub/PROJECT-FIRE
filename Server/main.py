import os
from datetime import timedelta
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

CLIENT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Client')

# Global flag: is MySQL available?
DB_AVAILABLE = False


def create_app():
    app = Flask(__name__)

    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET', 'project-fire-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    JWTManager(app)

    # ---- Register blueprints ----

    from routes.auth import auth_bp
    app.register_blueprint(auth_bp)

    from routes.fires import fires_bp
    app.register_blueprint(fires_bp)

    from routes.weather_route import weather_bp
    app.register_blueprint(weather_bp)

    from routes.users import users_bp
    app.register_blueprint(users_bp)

    from routes.forests_route import forests_bp
    app.register_blueprint(forests_bp)

    from routes.predict_top import predict_bp
    app.register_blueprint(predict_bp)

    from routes.predict_forest import predict_forest_bp
    app.register_blueprint(predict_forest_bp)

    from routes.add_fire import add_fire_bp
    app.register_blueprint(add_fire_bp)

    # ---- Serve Frontend ----

    @app.route('/')
    def serve_index():
        return send_from_directory(CLIENT_DIR, 'index.html')

    @app.route('/src/<path:filepath>')
    def serve_src(filepath):
        src_dir = os.path.join(CLIENT_DIR, 'src')
        resp = send_from_directory(src_dir, filepath)
        # Ensure JS files have correct MIME type for ES modules
        if filepath.endswith('.js'):
            resp.headers['Content-Type'] = 'application/javascript'
        return resp

    @app.route('/public/<path:filepath>')
    def serve_public(filepath):
        return send_from_directory(os.path.join(CLIENT_DIR, 'public'), filepath)

    # ---- Error handlers ----

    @app.errorhandler(ValueError)
    def handle_value_error(e):
        return jsonify({"error": str(e)}), 400

    @app.errorhandler(404)
    def handle_not_found(e):
        return send_from_directory(CLIENT_DIR, 'index.html')

    return app


app = create_app()

if __name__ == "__main__":
    from utils.db import init_db
    try:
        init_db()
        DB_AVAILABLE = True
        print("[OK] Database initialized successfully")
    except Exception as e:
        print(f"[WARN] Database init failed: {e}")
        print("       The app will run but auth/fires features need MySQL.")
        print("       Start MySQL and restart the server to enable all features.")

    print("")
    print("=== FireGuard Server ===")
    print("  URL: http://localhost:5001")
    print("========================")
    print("")
    app.run(debug=True, port=5001)