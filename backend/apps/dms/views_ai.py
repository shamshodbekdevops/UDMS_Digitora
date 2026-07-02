import json
import urllib.request
import urllib.error
import os
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

GEMINI_MODELS = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash-lite"]
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

    body = json.dumps(gemini_body).encode("utf-8")
    last_error = "Noma'lum xato"

    for model in GEMINI_MODELS:
        url = f"{GEMINI_BASE_URL}/{model}:generateContent?key={api_key}"
        try:
            req = urllib.request.Request(
                url,
                data=body,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=90) as resp:
                result = json.loads(resp.read().decode("utf-8"))
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            return Response({"text": text, "model": model})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("error", {}).get("message", err_body)
            except Exception:
                msg = err_body
            # 429 quota → try next model; other errors → stop immediately
            if e.code == 429:
                last_error = f"Quota tugagan ({model}). Keyingi modelga o'tilmoqda..."
                continue
            return Response(
                {"detail": f"Gemini xatosi {e.code}: {msg[:300]}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except (KeyError, IndexError):
            last_error = f"{model} javobini o'qib bo'lmadi"
            continue
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response(
        {"detail": f"Barcha Gemini modellari quota limitiga yetdi. Ertaga qayta urinib ko'ring yoki billing sozlang. Oxirgi xato: {last_error}"},
        status=status.HTTP_429_TOO_MANY_REQUESTS,
    )
