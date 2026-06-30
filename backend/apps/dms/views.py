from rest_framework import viewsets, permissions, filters
from .models import Device, AlertEvent, Driver
from .serializers import DeviceSerializer, DeviceCreateSerializer, AlertEventSerializer, DriverSerializer


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
            qs = qs.all()
        else:
            qs = qs.filter(owner=user)

        if self.request.query_params.get("unassigned") in ("true", "1"):
            qs = qs.filter(driver__isnull=True)

        return qs

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

        p = self.request.query_params

        device_id = p.get("device_id")
        if device_id:
            qs = qs.filter(device__device_id=device_id)

        level = p.get("level")
        if level is not None:
            qs = qs.filter(alarm_level=level)

        levels = p.get("levels")
        if levels:
            lvl_list = [int(l) for l in levels.split(",") if l.strip().isdigit()]
            if lvl_list:
                qs = qs.filter(alarm_level__in=lvl_list)

        date_from = p.get("date_from")
        if date_from:
            qs = qs.filter(timestamp__date__gte=date_from)

        date_to = p.get("date_to")
        if date_to:
            qs = qs.filter(timestamp__date__lte=date_to)

        return qs


class DriverViewSet(viewsets.ModelViewSet):
    serializer_class = DriverSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["full_name", "vehicle_plate", "phone"]
    ordering_fields = ["full_name", "created_at"]
    ordering = ["full_name"]

    def get_queryset(self):
        user = self.request.user
        qs = Driver.objects.select_related("device")
        if user.role == "admin":
            return qs.all()
        return qs.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
