from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.dms.models import Device, LiveStatus

User = get_user_model()

DRIVERS = [
    {"device_id": "DGT-001", "driver_name": "Shamshod Toshqobilov", "vehicle_plate": "01A777AA"},
    {"device_id": "DGT-002", "driver_name": "Bobur Rahimov",         "vehicle_plate": "30B456BB"},
    {"device_id": "DGT-003", "driver_name": "Jasur Yusupov",         "vehicle_plate": "01A123CC"},
    {"device_id": "DGT-004", "driver_name": "Dilshod Nazarov",       "vehicle_plate": "75K789DD"},
    {"device_id": "DGT-005", "driver_name": "Sanjar Karimov",        "vehicle_plate": "01B234EE"},
    {"device_id": "DGT-006", "driver_name": "Ulugbek Mirzayev",      "vehicle_plate": "30C567FF"},
    {"device_id": "DGT-007", "driver_name": "Behruz Xasanov",        "vehicle_plate": "01A890GG"},
    {"device_id": "DGT-008", "driver_name": "Timur Ergashev",        "vehicle_plate": "75K123HH"},
    {"device_id": "DGT-009", "driver_name": "Nodir Abdullayev",      "vehicle_plate": "01B456II"},
]

# Initial GPS positions near Tashkent / major Uzbekistan highways
INITIAL_GPS = [
    (41.2995, 69.2401),   # Tashkent center
    (41.3113, 69.2797),   # Tashkent east
    (41.5522, 69.1341),   # Chirchiq direction
    (40.9983, 69.3342),   # Tashkent south
    (41.0211, 71.4736),   # Andijan highway
    (40.3696, 71.7975),   # Fergana
    (39.6547, 66.9758),   # Samarkand
    (41.4023, 69.5102),   # Tashkent northeast
    (40.7891, 72.3441),   # Namangan
]


class Command(BaseCommand):
    help = "Seed database with 1 business user and 9 mock devices"

    def handle(self, *args, **options):
        # Create dispatcher user
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
            self.stdout.write("User 'dispatcher' already exists — skipping")

        # Create admin user
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

        # Create devices
        for i, driver in enumerate(DRIVERS):
            lat, lon = INITIAL_GPS[i]
            device, created = Device.objects.get_or_create(
                device_id=driver["device_id"],
                defaults={
                    "driver_name": driver["driver_name"],
                    "vehicle_plate": driver["vehicle_plate"],
                    "owner": user,
                    "is_active": True,
                },
            )
            LiveStatus.objects.get_or_create(
                device=device,
                defaults={
                    "alarm_level": 0,
                    "gps_lat": lat,
                    "gps_lon": lon,
                    "gps_speed": 0.0,
                    "perclos": 0.0,
                },
            )
            status = "Created" if created else "Already exists"
            self.stdout.write(f"  {status}: {device.device_id} — {device.driver_name}")

        self.stdout.write(self.style.SUCCESS("\nSeed complete. Run jetson_mock.py to simulate live data."))
