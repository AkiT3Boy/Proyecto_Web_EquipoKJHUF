from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from bson import ObjectId
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb://localhost:27017/Kjhuf"
mongo = PyMongo(app)


# ---------------- PRODUCTOS ----------------

@app.route("/api/productos", methods=["GET"])
def get_productos():
    productos = []
    for p in mongo.db.productos.find():
        p["_id"] = str(p["_id"])
        productos.append(p)
    return jsonify(productos)


@app.route("/api/productos", methods=["POST"])
def crear_producto():
    data = request.json
    mongo.db.productos.insert_one(data)
    return jsonify({"msg": "Producto creado"})


@app.route("/api/productos/<id>", methods=["PUT"])
def actualizar_producto(id):
    data = request.json
    mongo.db.productos.update_one(
        {"_id": ObjectId(id)},
        {"$set": data}
    )
    return jsonify({"msg": "Producto actualizado"})


@app.route("/api/productos/<id>", methods=["DELETE"])
def eliminar_producto(id):
    mongo.db.productos.delete_one({"_id": ObjectId(id)})
    return jsonify({"msg": "Producto eliminado"})


# ---------------- PROMOCIONES ----------------

@app.route("/api/promociones", methods=["GET"])
def get_promociones():
    promociones = []
    for p in mongo.db.promociones.find():
        p["_id"] = str(p["_id"])
        promociones.append(p)
    return jsonify(promociones)


@app.route("/api/promociones", methods=["POST"])
def crear_promocion():
    data = request.json

    mongo.db.promociones.insert_one({
        "titulo": data["titulo"],
        "descripcion": data["descripcion"],
        "producto_id": data["producto_id"],
        "tipo": data["tipo"],
        "valor": data["valor"]
    })

    return jsonify({"msg": "Promocion creada"})


@app.route("/api/promociones/<id>", methods=["DELETE"])
def eliminar_promocion(id):
    mongo.db.promociones.delete_one({"_id": ObjectId(id)})
    return jsonify({"msg": "Promocion eliminada"})


# ---------------- AUTENTICACIÓN ADMIN ----------------

@app.route("/api/admin/check-password", methods=["GET"])
def check_password():
    admin = mongo.db.admin.find_one({"tipo": "config"})
    if admin and admin.get("password_hash"):
        return jsonify({"passwordConfigured": True})
    return jsonify({"passwordConfigured": False})


@app.route("/api/admin/setup-password", methods=["POST"])
def setup_password():
    data = request.json
    password = data.get("password")
    
    if not password or len(password) < 4:
        return jsonify({"error": "La contraseña debe tener al menos 4 caracteres"}), 400
    
    admin = mongo.db.admin.find_one({"tipo": "config"})
    if admin and admin.get("password_hash"):
        return jsonify({"error": "La contraseña ya fue configurada"}), 400
    
    password_hash = generate_password_hash(password)
    mongo.db.admin.update_one(
        {"tipo": "config"},
        {"$set": {"password_hash": password_hash}},
        upsert=True
    )
    
    return jsonify({"msg": "Contraseña configurada correctamente"})


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    data = request.json
    password = data.get("password")
    
    if not password:
        return jsonify({"error": "Contraseña requerida"}), 400
    
    admin = mongo.db.admin.find_one({"tipo": "config"})
    if not admin or not admin.get("password_hash"):
        return jsonify({"error": "Contraseña no configurada"}), 400
    
    if check_password_hash(admin["password_hash"], password):
        return jsonify({"msg": "Login exitoso", "authenticated": True})
    
    return jsonify({"error": "Contraseña incorrecta"}), 401


@app.route("/api/admin/change-password", methods=["POST"])
def change_password():
    data = request.json
    old_password = data.get("oldPassword")
    new_password = data.get("newPassword")
    
    if not old_password or not new_password:
        return jsonify({"error": "Antigua y nueva contraseña requeridas"}), 400
    
    if len(new_password) < 4:
        return jsonify({"error": "La nueva contraseña debe tener al menos 4 caracteres"}), 400
    
    admin = mongo.db.admin.find_one({"tipo": "config"})
    if not admin or not admin.get("password_hash"):
        return jsonify({"error": "Contraseña no configurada"}), 400
    
    if not check_password_hash(admin["password_hash"], old_password):
        return jsonify({"error": "Contraseña antigua incorrecta"}), 401
    
    new_password_hash = generate_password_hash(new_password)
    mongo.db.admin.update_one(
        {"tipo": "config"},
        {"$set": {"password_hash": new_password_hash}}
    )
    
    return jsonify({"msg": "Contraseña actualizada correctamente"})


# ---------------- SERVER ----------------

def inicializar_datos():
    # Limpiar datos existentes para desarrollo
    mongo.db.productos.delete_many({})
    mongo.db.promociones.delete_many({})

    productos_ejemplo = [
        # Esquites
        {
            "nombre": "Esquites Chico",
            "descripcion": "Esquites tamaño chico - Maíz desgranado con mayonesa, queso, chile y limón",
            "precio": 40,
            "imagen": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400"
        },
        {
            "nombre": "Esquites Mediano",
            "descripcion": "Esquites tamaño mediano - Maíz desgranado con mayonesa, queso, chile y limón",
            "precio": 45,
            "imagen": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400"
        },
        {
            "nombre": "Esquites Grande",
            "descripcion": "Esquites tamaño grande - Maíz desgranado con mayonesa, queso, chile y limón",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400"
        },
        # Maruchan Loca
        {
            "nombre": "Maruchan Loca",
            "descripcion": "Sopa Maruchan preparada con estilo loco - picante y deliciosa",
            "precio": 80,
            "imagen": "https://images.unsplash.com/photo-1563379091339-03246963d96c?w=400"
        },
        # Tostielote
        {
            "nombre": "Tostielote",
            "descripcion": "Tostada de elote - crujiente con elote, mayonesa y queso",
            "precio": 70,
            "imagen": "https://images.unsplash.com/photo-1551782450-17144efb5723?w=400"
        },
        # Nachos
        {
            "nombre": "Nachos Sencillos",
            "descripcion": "Nachos sencillos con queso derretido",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400"
        },
        {
            "nombre": "Nachos Especiales",
            "descripcion": "Nachos especiales con carne, queso, jalapeños y crema",
            "precio": 70,
            "imagen": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400"
        },
        # Gomiboing
        {
            "nombre": "Gomiboing",
            "descripcion": "Refresco Gomiboing - bebida refrescante",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400"
        },
        # Fresas con crema
        {
            "nombre": "Fresas con Crema",
            "descripcion": "Fresas frescas con crema batida",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=400"
        },
        # Quesos Chico
        {
            "nombre": "Queso Fresco de Aro Chico",
            "descripcion": "Queso fresco de aro tamaño chico",
            "precio": 80,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Queso Oaxaca Chico",
            "descripcion": "Queso Oaxaca tamaño chico",
            "precio": 95,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Queso Panela Chico",
            "descripcion": "Queso panela tamaño chico",
            "precio": 80,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Queso Botanero Chico",
            "descripcion": "Queso botanero tamaño chico",
            "precio": 85,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        # Quesos Grande
        {
            "nombre": "Queso Fresco de Aro Grande",
            "descripcion": "Queso fresco de aro tamaño grande",
            "precio": 130,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Queso Oaxaca Grande",
            "descripcion": "Queso Oaxaca tamaño grande",
            "precio": 180,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Queso Panela Grande",
            "descripcion": "Queso panela tamaño grande",
            "precio": 150,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Queso Botanero Grande",
            "descripcion": "Queso botanero tamaño grande",
            "precio": 160,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        # Otros productos (1/2 kg)
        {
            "nombre": "Requesón 1/2 kg",
            "descripcion": "Requesón fresco - 1/2 kilogramo",
            "precio": 65,
            "imagen": "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400"
        },
        {
            "nombre": "Crema 1/2 kg",
            "descripcion": "Crema fresca - 1/2 kilogramo",
            "precio": 65,
            "imagen": "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400"
        },
        {
            "nombre": "Cecina 1/2 kg",
            "descripcion": "Cecina de res curada - 1/2 kilogramo",
            "precio": 150,
            "imagen": "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=400"
        },
        {
            "nombre": "Carne Enchilada 1/2 kg",
            "descripcion": "Carne enchilada - 1/2 kilogramo",
            "precio": 120,
            "imagen": "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400"
        },
        {
            "nombre": "Chorizo Casero 1/2 kg",
            "descripcion": "Chorizo casero - 1/2 kilogramo",
            "precio": 100,
            "imagen": "https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400"
        },
        # Raspados
        {
            "nombre": "Raspado Gloria",
            "descripcion": "Raspado sabor Gloria",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Chamoyada Mediano",
            "descripcion": "Raspado chamoyada tamaño mediano",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Chamoyada Grande",
            "descripcion": "Raspado chamoyada tamaño grande",
            "precio": 50,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Morejita",
            "descripcion": "Raspado sabor morejita",
            "precio": 35,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Frutas",
            "descripcion": "Raspado de frutas",
            "precio": 35,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Sabores Mediano",
            "descripcion": "Raspado de sabores tamaño mediano",
            "precio": 35,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Sabores Grande",
            "descripcion": "Raspado de sabores tamaño grande",
            "precio": 40,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        },
        {
            "nombre": "Raspado Especial K-JHUF Grande",
            "descripcion": "Raspado especial K-JHUF tamaño grande",
            "precio": 80,
            "imagen": "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400"
        }
    ]
    mongo.db.productos.insert_many(productos_ejemplo)
    print("Datos de ejemplo de productos insertados")

    # Obtener IDs de productos para crear promociones
    productos = list(mongo.db.productos.find({}, {"_id": 1}))
    if len(productos) >= 3:
        promociones_ejemplo = [
            {
                "titulo": "Oferta Esquites",
                "descripcion": "20% de descuento en todos los tamaños de esquites",
                "producto_id": str(productos[0]["_id"]),
                "tipo": "porcentaje",
                "valor": 20
            },
            {
                "titulo": "Combo Maruchan",
                "descripcion": "Maruchan Loca + refresco a precio especial",
                "producto_id": str(productos[3]["_id"]),
                "tipo": "precio",
                "valor": 110
            },
            {
                "titulo": "Descuento Nachos",
                "descripcion": "15% de descuento en nachos especiales",
                "producto_id": str(productos[6]["_id"]),
                "tipo": "porcentaje",
                "valor": 15
            }
        ]
        mongo.db.promociones.insert_many(promociones_ejemplo)
        print("Datos de ejemplo de promociones insertados")

if __name__ == "__main__":
    print("🚀 Iniciando servidor K-JHUF...")
    inicializar_datos()
    print("✅ Datos inicializados correctamente")
    print("🌐 Servidor ejecutándose en http://localhost:3000")
    app.run(debug=True, port=3000)