from flask import Flask

def create_app():
    app = Flask(__name__)
    
    # Load configurations
    app.config.from_object('config.Config')

    # Import and register routes
    from routes import bp as main_blueprint
    app.register_blueprint(main_blueprint)

    return app

if __name__ == "__main__":
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)