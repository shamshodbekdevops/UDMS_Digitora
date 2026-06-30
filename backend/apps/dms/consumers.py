import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


DASHBOARD_GROUP = "dms_dashboard"


class DMSConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        await self.channel_layer.group_add(DASHBOARD_GROUP, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(DASHBOARD_GROUP, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        try:
            data = json.loads(text_data)
        except (json.JSONDecodeError, TypeError):
            return

        await self._persist(data)

        await self.channel_layer.group_send(
            DASHBOARD_GROUP,
            {"type": "dms.broadcast", "payload": data},
        )

    async def dms_broadcast(self, event):
        await self.send(text_data=json.dumps(event["payload"]))

    @database_sync_to_async
    def _persist(self, data):
        from .models import Device, AlertEvent, LiveStatus

        device_id = data.get("device_id")
        if not device_id:
            return

        try:
            device = Device.objects.get(device_id=device_id)
        except Device.DoesNotExist:
            return

        gps = data.get("gps") or {}
        cabin = data.get("cabin") or {}

        AlertEvent.objects.create(
            device=device,
            alarm_level=data.get("alarm_level", 0),
            alarm_msg=data.get("alarm_msg", ""),
            perclos=data.get("perclos", 0.0),
            gps_lat=gps.get("lat"),
            gps_lon=gps.get("lon"),
            gps_speed=gps.get("speed"),
            cabin_temp=cabin.get("temp"),
            cabin_humidity=cabin.get("humidity"),
        )

        LiveStatus.objects.update_or_create(
            device=device,
            defaults={
                "alarm_level": data.get("alarm_level", 0),
                "gps_lat": gps.get("lat"),
                "gps_lon": gps.get("lon"),
                "gps_speed": gps.get("speed"),
                "perclos": data.get("perclos", 0.0),
            },
        )
