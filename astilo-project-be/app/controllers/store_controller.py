import cherrypy

from app.db import get_session
from app.models import Order, OrderItem, Product


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
            )
            session.add(product)
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
    def GET(self, order_id=None):
        user_id = int(cherrypy.request.user["sub"])
        with get_session() as session:
            if order_id is None:
                orders = session.query(Order).filter_by(user_id=user_id).all()
                return [o.to_dict() for o in orders]

            order = session.query(Order).filter_by(id=int(order_id), user_id=user_id).first()
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
            order.status = "paid"
            session.flush()
            return order.to_dict()
