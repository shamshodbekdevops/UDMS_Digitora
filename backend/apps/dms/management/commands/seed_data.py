from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.dms.models import AlertEvent, Device, Driver, LiveStatus

User = get_user_model()

REAL_DEVICES = [
    {
        "device_id": "DGT-001",
        "driver_name": "Shamshod Toshqobilov",
        "vehicle_plate": "01A777AA",
        "gps_lat": 41.2995,
        "gps_lon": 69.2401,
    },
    {
        "device_id": "DGT-002",
        "driver_name": "Bobur Rahimov",
        "vehicle_plate": "30B456BB",
        "gps_lat": 41.3113,
        "gps_lon": 69.2797,
    },
]


class Command(BaseCommand):
    help = "Reset mock fleet data and seed 2 real devices"

    def handle(self, *args, **options):
        with transaction.atomic():
            AlertEvent.objects.all().delete()
            LiveStatus.objects.all().delete()
            Driver.objects.all().delete()
            Device.objects.all().delete()

            user, created = User.objects.get_or_create(
                username="dispatcher",
                defaults={
                    "email": "dispatcher@digitora.uz",
                    "role": "business",
                    "company_name": "DIGITORA Logistics",
                    "first_name": "Dispatch",
                    "last_name": "Center",
                },
            )
            if created:
                user.set_password("Admin1234!")
                user.save()
                self.stdout.write(self.style.SUCCESS("Created user: dispatcher / Admin1234!"))
            else:
                self.stdout.write("User 'dispatcher' already exists - keeping account")

            admin, created = User.objects.get_or_create(
                username="admin",
                defaults={
                    "email": "admin@digitora.uz",
                    "role": "admin",
                    "is_staff": True,
                    "is_superuser": True,
                },
            )
            if created:
                admin.set_password("Admin1234!")
                admin.save()
                self.stdout.write(self.style.SUCCESS("Created superuser: admin / Admin1234!"))

            for device_data in REAL_DEVICES:
                device = Device.objects.create(
                    device_id=device_data["device_id"],
                    driver_name=device_data["driver_name"],
                    vehicle_plate=device_data["vehicle_plate"],
                    owner=user,
                    is_active=True,
                )
                LiveStatus.objects.create(
                    device=device,
                    alarm_level=0,
                    gps_lat=device_data["gps_lat"],
                    gps_lon=device_data["gps_lon"],
                    gps_speed=0.0,
                    perclos=0.0,
                )
                Driver.objects.create(
                    full_name=device_data["driver_name"],
                    vehicle_plate=device_data["vehicle_plate"],
                    device=device,
                    owner=user,
                )
                self.stdout.write(f"  Created: {device.device_id} - {device.driver_name}")

        self.stdout.write(self.style.SUCCESS("\nSeed complete. Use windows.py and jetson.py for live data."))
