
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/scan/$', consumers.ScanConsumer.as_asgi()),
    re_path(r'ws/interfaces/$', consumers.ScanConsumer.as_asgi()),
]
