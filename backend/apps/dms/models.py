from django.db import models
from django.conf import settings


class Device(models.Model):
    device_id = models.CharField(max_length=50, unique=True)
    driver_name = models.CharField(max_length=255)
    vehicle_plate = models.CharField(max_length=50)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="devices",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["device_id"]

    def __str__(self):
        return f"{self.device_id} — {self.driver_name}"


class AlertEvent(models.Model):
    LEVEL_CHOICES = [(0, "Safe"), (1, "Caution"), (2, "Warning"), (3, "Danger")]

    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="alerts")
    alarm_level = models.IntegerField(choices=LEVEL_CHOICES)
    alarm_msg = models.TextField()
    perclos = models.FloatField()
    gps_lat = models.FloatField(null=True, blank=True)
    gps_lon = models.FloatField(null=True, blank=True)
    gps_speed = models.FloatField(null=True, blank=True)
    cabin_temp = models.FloatField(null=True, blank=True)
    cabin_humidity = models.FloatField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        return f"[L{self.alarm_level}] {self.device.device_id} @ {self.timestamp}"


class LiveStatus(models.Model):
    device = models.OneToOneField(Device, on_delete=models.CASCADE, related_name="live")
    alarm_level = models.IntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)
    gps_lat = models.FloatField(null=True, blank=True)
    gps_lon = models.FloatField(null=True, blank=True)
    gps_speed = models.FloatField(null=True, blank=True)
    perclos = models.FloatField(default=0.0)

    def __str__(self):
        return f"Live: {self.device.device_id} L{self.alarm_level}"
