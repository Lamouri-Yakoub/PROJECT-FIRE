from flask import Flask, jsonify

def create_app():
    app = Flask(__name__)


    from routes.predict_top import predict_bp
    app.register_blueprint(predict_bp)
    
    from routes.predict_forest import predict_forest_bp
    app.register_blueprint(predict_forest_bp)

    from routes.add_fire import add_fire_bp
    app.register_blueprint(add_fire_bp)

    @app.errorhandler(ValueError)
    
    def handle_value_error(e):
        return jsonify({
            "error": str(e)
        }), 400

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)