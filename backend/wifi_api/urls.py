
from django.urls import path
from .views import (
    WifiInterfacesView,
    MonitorModeStartView,
    MonitorModeStopView,
    ScanNetworksView,
    DeauthAttackView,
    StatusView
)

urlpatterns = [
    path('interfaces/', WifiInterfacesView.as_view(), name='interfaces'),
    path('monitor/start/', MonitorModeStartView.as_view(), name='monitor_start'),
    path('monitor/stop/', MonitorModeStopView.as_view(), name='monitor_stop'),
    path('scan/', ScanNetworksView.as_view(), name='scan'),
    path('attack/deauth/', DeauthAttackView.as_view(), name='deauth'),
    path('status/', StatusView.as_view(), name='status'),
]
