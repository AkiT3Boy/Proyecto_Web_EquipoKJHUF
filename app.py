from functools import wraps
from secrets import token_hex
from datetime import datetime, timezone
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from bson import ObjectId
from bson.errors import InvalidId
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from flask_pymongo import PyMongo
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(app)

app.config["MONGO_URI"] = "mongodb://localhost:27017/Kjhuf"
mongo = PyMongo(app)

ADMIN_TOKENS = set()


def parse_object_id(value):
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None


def sanitize_text(value, default=""):
    if value is None:
        return default
    return str(value).strip()


def sanitize_number(value, default=0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def sanitize_list(value):
    if isinstance(value, list):
        return [sanitize_text(item) for item in value if sanitize_text(item)]

    if isinstance(value, str):
        return [item.strip() for item in value.replace(",", "\n").splitlines() if item.strip()]

    return []


def serialize_document(document):
    if not document:
        return None

    serializado = {}

    for key, value in document.items():
        if isinstance(value, ObjectId):
            serializado[key] = str(value)
        elif isinstance(value, list):
            serializado[key] = [str(item) if isinstance(item, ObjectId) else item for item in value]
        else:
            serializado[key] = value

    return serializado


def infer_categoria_producto(nombre, descripcion):
    contenido = f"{sanitize_text(nombre).lower()} {sanitize_text(descripcion).lower()}"

    categorias = {
        "raspados": ["raspado", "raspados", "granizado", "nieve"],
        "elotes": ["elote", "elotes", "esquite", "esquites", "maiz"],
        "snacks": ["snack", "snacks", "tosti", "nacho", "papas", "maruchan", "botana", "charola"],
        "carnes frias y quesos": [
            "queso",
            "quesos",
            "quesadilla",
            "cheese",
            "requeson",
            "crema",
            "jamon",
            "salami",
            "peperoni",
            "pepperoni",
            "chorizo",
            "enchilada",
            "carne enchilada",
            "carnes frias",
        ],
    }

    for categoria, keywords in categorias.items():
        if any(keyword in contenido for keyword in keywords):
            return categoria

    return "snacks"


def serialize_producto(document):
    serializado = serialize_document(document)
    imagen = sanitize_text(serializado.get("imagen_url") or serializado.get("imagen"))
    categoria = sanitize_text(serializado.get("categoria"))
    if categoria in {"quesos", "carnes frias", "carnes frias y quesos"}:
        categoria = "carnes frias y quesos"

    serializado["imagen_url"] = imagen
    serializado["imagen"] = imagen
    serializado["categoria"] = categoria or infer_categoria_producto(
        serializado.get("nombre"),
        serializado.get("descripcion"),
    )
    serializado["ingredientes"] = serializado.get("ingredientes") or []
    serializado["detalles"] = serializado.get("detalles") or []
    return serializado


def normalize_producto(data):
    nombre = sanitize_text(data.get("nombre"))
    descripcion = sanitize_text(data.get("descripcion"))
    imagen = sanitize_text(data.get("imagen_url") or data.get("imagen"))
    categoria = sanitize_text(data.get("categoria")) or infer_categoria_producto(nombre, descripcion)
    if categoria in {"quesos", "carnes frias", "carnes frias y quesos"}:
        categoria = "carnes frias y quesos"

    return {
        "nombre": nombre,
        "descripcion": descripcion,
        "precio": sanitize_number(data.get("precio")),
        "categoria": categoria,
        "imagen_url": imagen,
        "imagen": imagen,
        "ingredientes": sanitize_list(data.get("ingredientes")),
        "detalles": sanitize_list(data.get("detalles")),
        "destacado": bool(data.get("destacado", False)),
        "activo": bool(data.get("activo", True)),
    }


def normalize_promocion(data):
    producto_ids = data.get("producto_ids", [])
    producto_id = sanitize_text(data.get("producto_id"))

    if producto_id and producto_id not in producto_ids:
        producto_ids = [producto_id, *producto_ids]

    producto_ids_validos = []
    for producto in producto_ids:
        producto_texto = sanitize_text(producto)
        if producto_texto:
            producto_ids_validos.append(producto_texto)

    tipo = sanitize_text(data.get("tipo"), "porcentaje").lower()
    if tipo == "precio_fijo":
        tipo = "precio"

    return {
        "titulo": sanitize_text(data.get("titulo")),
        "descripcion": sanitize_text(data.get("descripcion")),
        "tipo": tipo,
        "valor": sanitize_number(data.get("valor")),
        "producto_ids": producto_ids_validos,
        "activo": bool(data.get("activo", True)),
    }


def get_admin_config():
    return mongo.db.admin.find_one({"tipo": "config"})


def normalize_pedido(data):
    items = []
    total = 0

    for item in (data.get("items") or []):
        producto_id = sanitize_text(item.get("producto_id"))
        nombre = sanitize_text(item.get("nombre"))
        precio = sanitize_number(item.get("precio"))
        cantidad = max(int(sanitize_number(item.get("cantidad"), 1)), 1)
        imagen_url = sanitize_text(item.get("imagen_url") or item.get("imagen"))
        subtotal = round(precio * cantidad, 2)

        if not nombre:
            continue

        items.append(
            {
                "producto_id": producto_id,
                "nombre": nombre,
                "precio": precio,
                "cantidad": cantidad,
                "imagen_url": imagen_url,
                "subtotal": subtotal,
            }
        )
        total += subtotal

    return {
        "cliente": sanitize_text(data.get("cliente"), "Cliente mostrador"),
        "telefono": sanitize_text(data.get("telefono")),
        "notas": sanitize_text(data.get("notas")),
        "estado": "pendiente",
        "items": items,
        "total": round(total, 2),
        "creado_en": datetime.now(timezone.utc).isoformat(),
    }


def ensure_seed_data():
    productos_demo = [
        {
            "nombre": "Esquites Chico",
            "descripcion": "Esquites tamano chico con mayonesa, queso, chile y limon.",
            "precio": 40,
            "categoria": "elotes",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Maiz desgranado", "Mayonesa", "Queso", "Chile", "Limon"],
            "detalles": ["Preparado al momento", "Picante ajustable"],
            "destacado": True,
            "activo": True,
        },
        {
            "nombre": "Esquites Mediano",
            "descripcion": "Esquites tamano mediano con mayonesa, queso, chile y limon.",
            "precio": 45,
            "categoria": "elotes",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Maiz desgranado", "Mayonesa", "Queso extra", "Chile", "Limon"],
            "detalles": ["Porcion mediana", "Salsa al gusto"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Maruchan Loca",
            "descripcion": "Maruchan preparada con salsa, queso, cueritos y botanita extra.",
            "precio": 80,
            "categoria": "snacks",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Maruchan", "Queso", "Cueritos", "Salsa", "Limon"],
            "detalles": ["Calientita al servir", "Toppings al gusto"],
            "destacado": True,
            "activo": True,
        },
        {
            "nombre": "Tostilocos Clasicos",
            "descripcion": "Tostitos preparados con cueritos, cacahuates, pepino y salsa.",
            "precio": 65,
            "categoria": "snacks",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Tostitos", "Cueritos", "Cacahuates", "Pepino", "Salsa"],
            "detalles": ["Crujiente y picosito", "Preparado al momento"],
            "destacado": True,
            "activo": True,
        },
        {
            "nombre": "Nachos Especiales",
            "descripcion": "Nachos con queso, jalapeno y aderezo para botanear.",
            "precio": 65,
            "categoria": "snacks",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Totopos", "Queso", "Jalapeno", "Aderezo"],
            "detalles": ["Queso extra opcional"],
            "destacado": True,
            "activo": True,
        },
        {
            "nombre": "Queso Fundido",
            "descripcion": "Queso fundido caliente con acompanamiento para compartir.",
            "precio": 95,
            "categoria": "carnes frias y quesos",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Queso fundido", "Totopos", "Chile"],
            "detalles": ["Sale caliente", "Ideal para compartir"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Queso Fresco",
            "descripcion": "Queso fresco para acompanar esquites, antojitos o botanear.",
            "precio": 55,
            "categoria": "carnes frias y quesos",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Queso fresco", "Sal ligera"],
            "detalles": ["Listo para servir", "Sabor suave"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Requeson Casero",
            "descripcion": "Requeson suave y fresco para antojitos, tostadas o acompanamientos.",
            "precio": 48,
            "categoria": "carnes frias y quesos",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Requeson", "Sal ligera"],
            "detalles": ["Textura cremosa", "Hecho para acompanar"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Crema Natural",
            "descripcion": "Crema natural espesa para esquites, tostadas y botanas preparadas.",
            "precio": 35,
            "categoria": "carnes frias y quesos",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Crema natural"],
            "detalles": ["Sabor casero", "Ideal como topping"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Jamon de Pavo",
            "descripcion": "Carne fria lista para complementar charolas, sandwiches y antojos.",
            "precio": 62,
            "categoria": "carnes frias y quesos",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Jamon de pavo"],
            "detalles": ["Listo para servir", "Ideal para combos"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Raspado Fresa",
            "descripcion": "Raspado clasico con jarabe de fresa y chamoy opcional.",
            "precio": 35,
            "categoria": "raspados",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Hielo raspado", "Jarabe de fresa", "Lechera"],
            "detalles": ["Frio y preparado al momento"],
            "destacado": False,
            "activo": True,
        },
        {
            "nombre": "Raspado Mango",
            "descripcion": "Raspado de mango dulce con tamarindo y chile si lo quieres.",
            "precio": 38,
            "categoria": "raspados",
            "imagen_url": "",
            "imagen": "",
            "ingredientes": ["Hielo raspado", "Jarabe de mango", "Tamarindo"],
            "detalles": ["Dulce y acidito", "Muy frio"],
            "destacado": False,
            "activo": True,
        },
    ]
    productos_ids = {}
    for producto in productos_demo:
        existente = mongo.db.productos.find_one(
            {"nombre": producto["nombre"]},
            {"_id": 1, "imagen_url": 1, "imagen": 1},
        )
        if existente:
            update = {"$set": {"categoria": producto["categoria"]}}
            imagen_actual = sanitize_text(existente.get("imagen_url") or existente.get("imagen"))

            if imagen_actual.startswith("/images/productos/"):
                update["$unset"] = {"imagen_url": "", "imagen": ""}

            mongo.db.productos.update_one({"_id": existente["_id"]}, update)
            productos_ids[producto["nombre"]] = str(existente["_id"])
            continue

        resultado = mongo.db.productos.insert_one(producto)
        productos_ids[producto["nombre"]] = str(resultado.inserted_id)

    promociones_demo = [
        {
            "titulo": "20% off",
            "descripcion": "Descuento directo en Esquites Chico.",
            "tipo": "porcentaje",
            "valor": 20,
            "producto_ids": [productos_ids["Esquites Chico"]],
            "activo": True,
        },
        {
            "titulo": "Ahora $110",
            "descripcion": "Combo botanero para compartir con antojo salado.",
            "tipo": "combo",
            "valor": 110,
            "producto_ids": [productos_ids["Maruchan Loca"], productos_ids["Nachos Especiales"]],
            "activo": True,
        },
        {
            "titulo": "15% off",
            "descripcion": "Promo especial para nachos con queso.",
            "tipo": "porcentaje",
            "valor": 15,
            "producto_ids": [productos_ids["Nachos Especiales"]],
            "activo": True,
        },
        {
            "titulo": "Lleva 2 paga 1",
            "descripcion": "Promo 2x1 en raspados seleccionados.",
            "tipo": "2x1",
            "valor": 2,
            "producto_ids": [productos_ids["Raspado Fresa"], productos_ids["Raspado Mango"]],
            "activo": True,
        },
    ]
    for promocion in promociones_demo:
        existente = mongo.db.promociones.find_one({"titulo": promocion["titulo"]}, {"_id": 1})
        if existente:
            continue
        mongo.db.promociones.insert_one(promocion)


with app.app_context():
    ensure_seed_data()


def require_admin(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Admin-Token", "")
        if token not in ADMIN_TOKENS:
            return jsonify({"msg": "Sesion de admin no valida"}), 401
        return func(*args, **kwargs)

    return wrapper


@app.route("/api/admin/status", methods=["GET"])
def admin_status():
    return jsonify({"configured": bool(get_admin_config())})


@app.route("/api/admin/setup", methods=["POST"])
def admin_setup():
    if get_admin_config():
        return jsonify({"msg": "La contrasena ya fue configurada"}), 400

    password = sanitize_text((request.json or {}).get("password"))
    if len(password) < 4:
        return jsonify({"msg": "La contrasena debe tener al menos 4 caracteres"}), 400

    mongo.db.admin.insert_one(
        {
            "tipo": "config",
            "password_hash": generate_password_hash(password),
        }
    )

    token = token_hex(24)
    ADMIN_TOKENS.add(token)
    return jsonify({"msg": "Admin configurado", "token": token})


@app.route("/api/admin/login", methods=["POST"])
def admin_login():
    config = get_admin_config()
    if not config:
        return jsonify({"msg": "Primero crea la contrasena de admin"}), 404

    password = sanitize_text((request.json or {}).get("password"))
    if not check_password_hash(config["password_hash"], password):
        return jsonify({"msg": "Contrasena incorrecta"}), 401

    token = token_hex(24)
    ADMIN_TOKENS.add(token)
    return jsonify({"msg": "Sesion iniciada", "token": token})


@app.route("/api/admin/logout", methods=["POST"])
@require_admin
def admin_logout():
    token = request.headers.get("X-Admin-Token", "")
    ADMIN_TOKENS.discard(token)
    return jsonify({"msg": "Sesion cerrada"})


@app.route("/api/productos", methods=["GET"])
def get_productos():
    productos = [serialize_producto(producto) for producto in mongo.db.productos.find().sort("nombre", 1)]
    return jsonify(productos)


@app.route("/api/imagen-proxy", methods=["GET"])
def imagen_proxy():
    url = sanitize_text(request.args.get("url"))
    parsed = urlparse(url)

    if parsed.scheme not in {"http", "https"}:
        return jsonify({"msg": "URL de imagen invalida"}), 400

    try:
        req = Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0",
                "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            },
        )
        with urlopen(req, timeout=12) as response:
            data = response.read()
            content_type = response.headers.get_content_type() or "image/jpeg"
            return Response(data, mimetype=content_type)
    except Exception:
        return jsonify({"msg": "No se pudo cargar la imagen remota"}), 502


@app.route("/api/productos/<id>", methods=["GET"])
def get_producto(id):
    object_id = parse_object_id(id)
    if not object_id:
        return jsonify({"msg": "Producto invalido"}), 400

    producto = mongo.db.productos.find_one({"_id": object_id})
    if not producto:
        return jsonify({"msg": "Producto no encontrado"}), 404

    return jsonify(serialize_producto(producto))


@app.route("/api/productos", methods=["POST"])
@require_admin
def crear_producto():
    payload = normalize_producto(request.json or {})
    resultado = mongo.db.productos.insert_one(payload)
    return jsonify({"msg": "Producto creado", "_id": str(resultado.inserted_id)})


@app.route("/api/productos/<id>", methods=["PUT"])
@require_admin
def actualizar_producto(id):
    object_id = parse_object_id(id)
    if not object_id:
        return jsonify({"msg": "Producto invalido"}), 400

    payload = normalize_producto(request.json or {})
    mongo.db.productos.update_one({"_id": object_id}, {"$set": payload})
    return jsonify({"msg": "Producto actualizado"})


@app.route("/api/productos/<id>", methods=["DELETE"])
@require_admin
def eliminar_producto(id):
    object_id = parse_object_id(id)
    if not object_id:
        return jsonify({"msg": "Producto invalido"}), 400

    mongo.db.productos.delete_one({"_id": object_id})
    mongo.db.promociones.delete_many({"$or": [{"producto_ids": id}, {"producto_id": id}]})
    return jsonify({"msg": "Producto eliminado"})


@app.route("/api/promociones", methods=["GET"])
def get_promociones():
    promociones = []
    for promocion in mongo.db.promociones.find():
        serializada = serialize_document(promocion)
        if "producto_ids" not in serializada:
            producto_id = serializada.get("producto_id")
            serializada["producto_ids"] = [producto_id] if producto_id else []
        promociones.append(serializada)

    return jsonify(promociones)


@app.route("/api/promociones", methods=["POST"])
@require_admin
def crear_promocion():
    payload = normalize_promocion(request.json or {})
    resultado = mongo.db.promociones.insert_one(payload)
    return jsonify({"msg": "Promocion creada", "_id": str(resultado.inserted_id)})


@app.route("/api/promociones/<id>", methods=["PUT"])
@require_admin
def actualizar_promocion(id):
    object_id = parse_object_id(id)
    if not object_id:
        return jsonify({"msg": "Promocion invalida"}), 400

    payload = normalize_promocion(request.json or {})
    mongo.db.promociones.update_one({"_id": object_id}, {"$set": payload})
    return jsonify({"msg": "Promocion actualizada"})


@app.route("/api/promociones/<id>", methods=["DELETE"])
@require_admin
def eliminar_promocion(id):
    object_id = parse_object_id(id)
    if not object_id:
        return jsonify({"msg": "Promocion invalida"}), 400

    mongo.db.promociones.delete_one({"_id": object_id})
    return jsonify({"msg": "Promocion eliminada"})


@app.route("/api/pedidos", methods=["GET"])
@require_admin
def get_pedidos():
    pedidos = [serialize_document(pedido) for pedido in mongo.db.pedidos.find().sort("creado_en", -1)]
    return jsonify(pedidos)


@app.route("/api/pedidos", methods=["POST"])
def crear_pedido():
    payload = normalize_pedido(request.json or {})
    if not payload["items"]:
        return jsonify({"msg": "El pedido debe incluir al menos un producto"}), 400

    resultado = mongo.db.pedidos.insert_one(payload)
    return jsonify({"msg": "Pedido recibido", "_id": str(resultado.inserted_id)})


@app.route("/api/pedidos/<id>/estado", methods=["PATCH"])
@require_admin
def actualizar_estado_pedido(id):
    object_id = parse_object_id(id)
    if not object_id:
        return jsonify({"msg": "Pedido invalido"}), 400

    estado = sanitize_text((request.json or {}).get("estado"), "pendiente").lower()
    if estado not in {"pendiente", "en_proceso", "entregado", "cancelado"}:
        return jsonify({"msg": "Estado de pedido no valido"}), 400

    mongo.db.pedidos.update_one({"_id": object_id}, {"$set": {"estado": estado}})
    return jsonify({"msg": "Estado actualizado"})


@app.route("/api/admin/dashboard", methods=["GET"])
@require_admin
def admin_dashboard():
    pedidos = [serialize_document(pedido) for pedido in mongo.db.pedidos.find()]
    promociones_activas = mongo.db.promociones.count_documents({"activo": True})
    productos_activos = mongo.db.productos.count_documents({"activo": True})
    pedidos_pendientes = sum(1 for pedido in pedidos if pedido.get("estado") == "pendiente")
    total_ingresos = sum(float(pedido.get("total", 0)) for pedido in pedidos if pedido.get("estado") != "cancelado")

    conteo_productos = {}
    for pedido in pedidos:
        for item in pedido.get("items", []):
            producto_id = item.get("producto_id") or item.get("nombre")
            if not producto_id:
                continue

            actual = conteo_productos.get(
                producto_id,
                {
                    "producto_id": item.get("producto_id"),
                    "nombre": item.get("nombre", "Producto"),
                    "cantidad": 0,
                },
            )
            actual["cantidad"] += int(item.get("cantidad", 0))
            conteo_productos[producto_id] = actual

    top_productos = sorted(
        conteo_productos.values(),
        key=lambda producto: producto["cantidad"],
        reverse=True,
    )[:5]

    return jsonify(
        {
            "metrics": {
                "productos_activos": productos_activos,
                "promociones_activas": promociones_activas,
                "pedidos_pendientes": pedidos_pendientes,
                "total_pedidos": len(pedidos),
                "ingresos_estimados": round(total_ingresos, 2),
            },
            "top_productos": top_productos,
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=3000)
