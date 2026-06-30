from rest_framework import serializers
from .models import Device, AlertEvent, LiveStatus


class LiveStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveStatus
        fields = ["alarm_level", "last_seen", "gps_lat", "gps_lon", "gps_speed", "perclos"]


class DeviceSerializer(serializers.ModelSerializer):
    live = LiveStatusSerializer(read_only=True)

    class Meta:
        model = Device
        fields = [
            "id", "device_id", "driver_name", "vehicle_plate",
            "is_active", "created_at", "live",
        ]
        read_only_fields = ["id", "created_at"]


class DeviceCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ["device_id", "driver_name", "vehicle_plate", "is_active"]

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        device = Device.objects.create(**validated_data)
        LiveStatus.objects.create(device=device)
        return device


class AlertEventSerializer(serializers.ModelSerializer):
    device_id = serializers.CharField(source="device.device_id", read_only=True)

    class Meta:
        model = AlertEvent
        fields = [
            "id", "device_id", "alarm_level", "alarm_msg", "perclos",
            "gps_lat", "gps_lon", "gps_speed",
            "cabin_temp", "cabin_humidity", "timestamp",
        ]
