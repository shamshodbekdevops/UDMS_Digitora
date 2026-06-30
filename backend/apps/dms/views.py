from rest_framework import viewsets, permissions, filters
from .models import Device, AlertEvent
from .serializers import DeviceSerializer, DeviceCreateSerializer, AlertEventSerializer


class DeviceViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["device_id", "driver_name", "vehicle_plate"]
    ordering_fields = ["device_id", "created_at"]
    ordering = ["device_id"]

    def get_queryset(self):
        user = self.request.user
        qs = Device.objects.select_related("live")
        if user.role == "admin":
            return qs.all()
        return qs.filter(owner=user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return DeviceCreateSerializer
        return DeviceSerializer


class AlertEventViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AlertEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["device__device_id", "alarm_msg"]
    ordering_fields = ["timestamp", "alarm_level"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        user = self.request.user
        qs = AlertEvent.objects.select_related("device")

        if user.role == "admin":
            qs = qs.all()
        else:
            qs = qs.filter(device__owner=user)

        device_id = self.request.query_params.get("device_id")
        if device_id:
            qs = qs.filter(device__device_id=device_id)

        level = self.request.query_params.get("level")
        if level is not None:
            qs = qs.filter(alarm_level=level)

        return qs
