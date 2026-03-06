from flask import Flask, jsonify, request
from flask_pymongo import PyMongo
from flask_cors import CORS
from bson import ObjectId

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


# ---------------- SERVER ----------------

if __name__ == "__main__":
    app.run(debug=True, port=3000)