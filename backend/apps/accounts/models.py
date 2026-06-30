from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ("free", "Free / Individual"),
        ("business", "Business"),
        ("admin", "Admin"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="free")
    company_name = models.CharField(max_length=255, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email_alerts_level3 = models.BooleanField(default=False)
    browser_push_notifications = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.role})"
