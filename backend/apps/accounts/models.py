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

    def __str__(self):
        return f"{self.username} ({self.role})"
