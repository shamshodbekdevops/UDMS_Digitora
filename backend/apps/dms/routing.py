from django.urls import path
from .consumers import DMSConsumer

websocket_urlpatterns = [
    path("ws/dms/", DMSConsumer.as_asgi()),
]
