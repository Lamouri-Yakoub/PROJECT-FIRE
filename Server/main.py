from flask import Flask, jsonify
from flask_cors import CORS

def create_app():
    app = Flask(__name__)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ---- Register blueprints ----

    from routes.predict_top import predict_bp
    app.register_blueprint(predict_bp)

    from routes.predict_forest import predict_forest_bp
    app.register_blueprint(predict_forest_bp)

    from routes.add_fire import add_fire_bp
    app.register_blueprint(add_fire_bp)

    from routes.reports import reports_bp
    app.register_blueprint(reports_bp)

    # ---- Error handlers ----

    @app.errorhandler(ValueError)
    def handle_value_error(e):
        return jsonify({"error": str(e)}), 400

    return app


app = create_app()

if __name__ == "__main__":

    print("")
    print("=== FireGuard Server ===")
    print("  URL: http://localhost:5000")
    print("========================")
    print("")
    app.run(debug=True, port=5000)