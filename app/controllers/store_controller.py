import random

import cherrypy

from app.db import get_session
from app.models import Order, OrderItem, Product, utcnow

SHIP_TRANSITIONS = {
    "pending": {"cancelled"},
    "paid": {"shipped", "cancelled"},
    "shipped": {"delivered"},
}


class ProductsController:
    exposed = True

    @cherrypy.tools.json_out()
    def GET(self, product_id=None, category=None):
        with get_session() as session:
            if product_id is not None:
                product = session.get(Product, int(product_id))
                if not product:
                    raise cherrypy.HTTPError(404, "Product not found")
                return product.to_dict()

            query = session.query(Product)
            if category:
                query = query.filter_by(category=category)
            return [p.to_dict() for p in query.all()]

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        body = cherrypy.request.json or {}
        name = (body.get("name") or "").strip()
        price = body.get("price")
        if not name or price is None:
            raise cherrypy.HTTPError(400, "name and price are required")

        with get_session() as session:
            product = Product(
                name=name,
                description=body.get("description"),
                price=float(price),
                image_url=body.get("imageUrl"),
                category=body.get("category"),
                stock=int(body.get("stock", 0)),
                specs=body.get("specs"),
            )
            session.add(product)
            session.flush()
            return product.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, product_id):
        body = cherrypy.request.json or {}
        with get_session() as session:
            product = session.get(Product, int(product_id))
            if not product:
                raise cherrypy.HTTPError(404, "Product not found")

            if "name" in body:
                product.name = (body["name"] or "").strip()
            if "description" in body:
                product.description = body["description"]
            if "price" in body:
                product.price = float(body["price"])
            if "imageUrl" in body:
                product.image_url = body["imageUrl"]
            if "category" in body:
                product.category = body["category"]
            if "stock" in body:
                product.stock = int(body["stock"])
            if "specs" in body:
                product.specs = body["specs"]

            session.flush()
            return product.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.admin_only()
    @cherrypy.tools.json_out()
    def DELETE(self, product_id):
        with get_session() as session:
            product = session.get(Product, int(product_id))
            if not product:
                raise cherrypy.HTTPError(404, "Product not found")
            session.delete(product)
            return {"deleted": True}


class OrdersController:
    exposed = True

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    def GET(self, order_id=None, show_all=None):
        claims = cherrypy.request.user
        user_id = int(claims["sub"])
        is_admin = claims.get("role") == "admin"

        with get_session() as session:
            if order_id is None:
                query = session.query(Order)
                if not (show_all and is_admin):
                    query = query.filter_by(user_id=user_id)
                orders = query.order_by(Order.created_at.desc()).all()
                return [
                    {**o.to_dict(), "userId": o.user_id, "userEmail": o.user.email if o.user else None}
                    for o in orders
                ] if is_admin else [o.to_dict() for o in orders]

            query = session.query(Order).filter_by(id=int(order_id))
            if not is_admin:
                query = query.filter_by(user_id=user_id)
            order = query.first()
            if not order:
                raise cherrypy.HTTPError(404, "Order not found")
            return order.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def POST(self):
        """Checkout: body = {items: [{productId, quantity}]}"""
        user_id = int(cherrypy.request.user["sub"])
        body = cherrypy.request.json or {}
        items = body.get("items") or []
        if not items:
            raise cherrypy.HTTPError(400, "items is required")

        with get_session() as session:
            order = Order(user_id=user_id, status="pending", total=0)
            session.add(order)
            session.flush()

            total = 0.0
            for item in items:
                product = session.get(Product, int(item.get("productId")))
                if not product:
                    raise cherrypy.HTTPError(404, f"Product {item.get('productId')} not found")
                quantity = max(1, int(item.get("quantity", 1)))
                if product.stock < quantity:
                    raise cherrypy.HTTPError(409, f"Not enough stock for {product.name}")

                product.stock -= quantity
                total += product.price * quantity
                session.add(OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=product.price,
                ))

            order.total = total
            session.flush()
            return order.to_dict()

    @cherrypy.tools.auth()
    @cherrypy.tools.json_out()
    @cherrypy.tools.json_in()
    def PUT(self, order_id):
        """Owner: {action: "pay", ...card fields} or {action: "cancel"}.
        Admin: {status: "shipped" | "delivered" | "cancelled"}."""
        claims = cherrypy.request.user
        user_id = int(claims["sub"])
        is_admin = claims.get("role") == "admin"
        body = cherrypy.request.json or {}

        with get_session() as session:
            order = session.get(Order, int(order_id))
            if not order or (not is_admin and order.user_id != user_id):
                raise cherrypy.HTTPError(404, "Order not found")

            action = body.get("action")
            if action == "pay":
                if order.user_id != user_id:
                    raise cherrypy.HTTPError(403, "Not your order")
                if order.status != "pending":
                    raise cherrypy.HTTPError(409, f"Order is {order.status}, not pending")
                card_number = (body.get("cardNumber") or "").replace(" ", "")
                expiry = (body.get("expiry") or "").strip()
                cvv = (body.get("cvv") or "").strip()
                name = (body.get("name") or "").strip()
                if not (card_number.isdigit() and len(card_number) >= 12 and expiry and cvv.isdigit() and name):
                    raise cherrypy.HTTPError(400, "Invalid card details")
                if random.random() < 0.1:
                    raise cherrypy.HTTPError(402, "Payment declined, please try again")
                order.status = "paid"
                order.paid_at = utcnow()
                session.flush()
                return order.to_dict()

            if action == "cancel":
                if order.user_id != user_id and not is_admin:
                    raise cherrypy.HTTPError(403, "Not your order")
                if order.status not in ("pending", "paid"):
                    raise cherrypy.HTTPError(409, f"Order is {order.status} and can't be cancelled")
                for item in order.items:
                    product = session.get(Product, item.product_id)
                    if product:
                        product.stock += item.quantity
                order.status = "cancelled"
                session.flush()
                return order.to_dict()

            status = body.get("status")
            if status:
                if not is_admin:
                    raise cherrypy.HTTPError(403, "Admin only")
                allowed = SHIP_TRANSITIONS.get(order.status, set())
                if status not in allowed:
                    raise cherrypy.HTTPError(409, f"Can't move order from {order.status} to {status}")
                order.status = status
                if status == "shipped":
                    order.shipped_at = utcnow()
                elif status == "delivered":
                    order.delivered_at = utcnow()
                elif status == "cancelled":
                    for item in order.items:
                        product = session.get(Product, item.product_id)
                        if product:
                            product.stock += item.quantity
                session.flush()
                return order.to_dict()

            raise cherrypy.HTTPError(400, "action or status is required")
