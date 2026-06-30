from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from apps.accounts.views import MeView
from apps.dms.views import AlertEventViewSet, DeviceCountView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/accounts/", include("apps.accounts.urls")),
    path("api/dms/", include("apps.dms.urls")),
    path("api/users/me/", MeView.as_view(), name="user-me-alias"),
    path("api/alert-events/", AlertEventViewSet.as_view({"get": "list"}), name="alert-events-alias"),
    path("api/devices/count/", DeviceCountView.as_view(), name="device-count-alias"),
]
