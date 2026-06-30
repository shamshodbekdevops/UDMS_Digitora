from django.contrib import admin
from .models import Device, AlertEvent, LiveStatus


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ["device_id", "driver_name", "vehicle_plate", "owner", "is_active"]
    list_filter = ["is_active"]
    search_fields = ["device_id", "driver_name", "vehicle_plate"]


@admin.register(AlertEvent)
class AlertEventAdmin(admin.ModelAdmin):
    list_display = ["device", "alarm_level", "perclos", "timestamp"]
    list_filter = ["alarm_level"]
    readonly_fields = ["timestamp"]


@admin.register(LiveStatus)
class LiveStatusAdmin(admin.ModelAdmin):
    list_display = ["device", "alarm_level", "perclos", "last_seen"]
