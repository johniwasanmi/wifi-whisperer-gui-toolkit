
"""
WSGI config for wifi_framework project.
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wifi_framework.settings')

application = get_wsgi_application()
