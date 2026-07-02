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


def _get_api_key():
    return os.environ.get("GEMINI_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")


def _fetch_available_models(api_key):
    """Return list of (api_ver, model_id) that support generateContent."""
    results = []
    for api_ver in ("v1beta", "v1"):
        url = f"{GEMINI_BASE_URL}/{api_ver}/models?key={api_key}&pageSize=50"
        try:
            req = urllib.request.Request(url, method="GET")
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            for m in data.get("models", []):
                if "generateContent" in m.get("supportedGenerationMethods", []):
                    # name is like "models/gemini-1.5-flash"
                    model_id = m["name"].replace("models/", "")
                    results.append((api_ver, model_id))
            if results:
                break  # found models on this api_ver, stop
        except Exception:
            continue
    return results


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ai_report_proxy(request):
    api_key = _get_api_key()
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

    # Discover available models dynamically
    candidates = _fetch_available_models(api_key)
    if not candidates:
        return Response(
            {"detail": "Bu API key uchun hech qanday Gemini modeli topilmadi. Key to'g'riligini tekshiring."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    last_error = "Noma'lum xato"
    for api_ver, model in candidates:
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
            if e.code in (404, 429):
                last_error = f"{e.code} {model}: {msg[:150]}"
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
        {"detail": f"Gemini modellari ishlamadi. Oxirgi xato: {last_error}"},
        status=status.HTTP_502_BAD_GATEWAY,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def ai_list_models(request):
    """Debug endpoint — returns available models for the configured API key."""
    api_key = _get_api_key()
    if not api_key:
        return Response({"detail": "GEMINI_API_KEY yo'q"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    candidates = _fetch_available_models(api_key)
    return Response({"models": [f"{v}/{m}" for v, m in candidates]})
