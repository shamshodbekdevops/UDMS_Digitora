from rest_framework.permissions import BasePermission


class IsBusinessOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ("business", "admin")


class IsDeviceOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.user.role == "admin":
            return True
        return obj.owner == request.user
