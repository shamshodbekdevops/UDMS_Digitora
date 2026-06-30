from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, AlertEventViewSet

router = DefaultRouter()
router.register("devices", DeviceViewSet, basename="device")
router.register("alerts", AlertEventViewSet, basename="alert")

urlpatterns = [
    path("", include(router.urls)),
]
