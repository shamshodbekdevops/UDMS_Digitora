import json
import urllib.request
import urllib.error
import os
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com"
# (api_version, model_name) — tried in order until one succeeds
GEMINI_CANDIDATES = [
    ("v1",    "gemini-1.5-flash"),
    ("v1",    "gemini-1.5-flash-latest"),
    ("v1",    "gemini-pro"),
    ("v1beta","gemini-1.5-flash-latest"),
    ("v1beta","gemini-1.5-flash-8b"),
    ("v1beta","gemini-pro"),
]


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

    for api_ver, model in GEMINI_CANDIDATES:
        url = f"{GEMINI_BASE_URL}/{api_ver}/models/{model}:generateContent?key={api_key}"
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
            return Response({"text": text, "model": f"{api_ver}/{model}"})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            try:
                msg = json.loads(err_body).get("error", {}).get("message", err_body)
            except Exception:
                msg = err_body
            short = msg[:200]
            if e.code in (404, 429):
                last_error = f"{e.code} {api_ver}/{model}: {short}"
                continue
            return Response(
                {"detail": f"Gemini xatosi {e.code}: {short}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except (KeyError, IndexError):
            last_error = f"{api_ver}/{model} javobini o'qib bo'lmadi"
            continue
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    return Response(
        {"detail": f"Gemini API ishlamadi. Oxirgi xato: {last_error}"},
        status=status.HTTP_502_BAD_GATEWAY,
    )
