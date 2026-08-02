"""
Shared Flask extension instances.
Import these into blueprints — never import the app object directly
(avoids circular imports).
"""
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()
