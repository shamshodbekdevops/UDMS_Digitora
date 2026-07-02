import json
import urllib.request
import urllib.error
import os
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_report_proxy(request):
    # Read at request time so container restart is not required after .env change
    api_key = os.environ.get("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        return Response(
            {"detail": "AI xizmat sozlanmagan. Server .env faylida GEMINI_API_KEY yo'q."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    prompt = request.data.get("prompt", "")
    if not prompt:
        return Response({"detail": "Prompt bo'sh"}, status=status.HTTP_400_BAD_REQUEST)

    gemini_body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": request.data.get("max_tokens", 1024),
            "temperature": 0.7,
        },
    }

    url = f"{GEMINI_BASE_URL}/{GEMINI_MODEL}:generateContent?key={api_key}"

    try:
        body = json.dumps(gemini_body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            result = json.loads(resp.read().decode("utf-8"))

        text = result["candidates"][0]["content"]["parts"][0]["text"]
        return Response({"text": text})

    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        return Response(
            {"detail": f"Gemini API xatosi ({e.code}): {err_body}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except (KeyError, IndexError) as e:
        return Response(
            {"detail": f"Gemini javobini o'qib bo'lmadi: {e}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    except Exception as e:
        return Response(
            {"detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
