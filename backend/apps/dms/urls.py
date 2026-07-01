from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DeviceViewSet, AlertEventViewSet, DriverViewSet, DeviceCountView
from .views_video import upload_frame, get_frame

router = DefaultRouter()
router.register("devices", DeviceViewSet, basename="device")
router.register("alerts", AlertEventViewSet, basename="alert")
router.register("drivers", DriverViewSet, basename="driver")

urlpatterns = [
    path("", include(router.urls)),
    path("devices/count/", DeviceCountView.as_view(), name="device-count"),
    path("video-frame/<str:device_id>/upload/", upload_frame, name="video-frame-upload"),
    path("video-frame/<str:device_id>/", get_frame, name="video-frame-get"),
]
