
"""URL configuration for wifi_framework project."""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('wifi_api.urls')),
]
