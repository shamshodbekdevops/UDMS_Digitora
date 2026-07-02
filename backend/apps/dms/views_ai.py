import json
import urllib.request
import urllib.error
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_report_proxy(request):
    api_key = getattr(settings, "ANTHROPIC_API_KEY", "")
    if not api_key:
        return Response(
            {"error": "AI xizmat sozlanmagan. Server administratoriga murojaat qiling."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        body = json.dumps(request.data).encode("utf-8")
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read().decode("utf-8"))
        return Response(result)

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return Response(
            {"error": f"AI API xatosi ({e.code}): {err_body}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
