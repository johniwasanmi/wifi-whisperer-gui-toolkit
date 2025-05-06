
from rest_framework import serializers

class WifiInterfaceSerializer(serializers.Serializer):
    name = serializers.CharField()
    driver = serializers.CharField()
    chipset = serializers.CharField()
    status = serializers.CharField()
    phy = serializers.CharField(required=False)  # New field for physical device

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

class ClientSerializer(serializers.Serializer):
    mac = serializers.CharField()
    bssid = serializers.CharField()
    power = serializers.IntegerField()
    rate = serializers.CharField()
    lost = serializers.IntegerField()
    frames = serializers.IntegerField()
    probe = serializers.ListField(child=serializers.CharField(), required=False)
    vendor = serializers.CharField(required=False)
    firstSeen = serializers.IntegerField()
    lastSeen = serializers.IntegerField()

class ScanResultSerializer(serializers.Serializer):
    networks = NetworkSerializer(many=True)
    clients = ClientSerializer(many=True, required=False)

class MonitorModeSerializer(serializers.Serializer):
    interface = serializers.CharField()

class DeauthAttackSerializer(serializers.Serializer):
    bssid = serializers.CharField()
    clientMac = serializers.CharField(allow_blank=True, required=False)
    packets = serializers.IntegerField(required=False, default=10)

class AirodumpOutputSerializer(serializers.Serializer):
    output = serializers.CharField()
