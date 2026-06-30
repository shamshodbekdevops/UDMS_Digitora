from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, AlertEventViewSet, DriverViewSet

router = DefaultRouter()
router.register("devices", DeviceViewSet, basename="device")
router.register("alerts", AlertEventViewSet, basename="alert")
router.register("drivers", DriverViewSet, basename="driver")

urlpatterns = [
    path("", include(router.urls)),
]
