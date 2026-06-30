from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ["username", "email", "role", "company_name", "phone", "is_active"]
    list_filter = ["role", "is_active"]
    fieldsets = UserAdmin.fieldsets + (
        ("DIGITORA", {"fields": ("role", "company_name", "phone", "email_alerts_level3", "browser_push_notifications")}),
    )
