
from rest_framework import serializers

class WifiInterfaceSerializer(serializers.Serializer):
    name = serializers.CharField()
    driver = serializers.CharField()
    chipset = serializers.CharField()
    status = serializers.CharField()

class NetworkSerializer(serializers.Serializer):
    id = serializers.CharField()
    ssid = serializers.CharField(allow_blank=True)
    bssid = serializers.CharField()
    channel = serializers.IntegerField()
    signal = serializers.IntegerField()
    encryption = serializers.CharField()
    vendor = serializers.CharField()
    clients = serializers.IntegerField()
    firstSeen = serializers.IntegerField()
    lastSeen = serializers.IntegerField()

class ScanResultSerializer(serializers.Serializer):
    networks = NetworkSerializer(many=True)

class MonitorModeSerializer(serializers.Serializer):
    interface = serializers.CharField()

class DeauthAttackSerializer(serializers.Serializer):
    bssid = serializers.CharField()
    clientMac = serializers.CharField(allow_blank=True, required=False)
    packets = serializers.IntegerField(required=False, default=10)
