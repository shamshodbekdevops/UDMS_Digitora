import time
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['POST', 'OPTIONS'])
@permission_classes([AllowAny])
def upload_frame(request, device_id):
    """Jetson POSTs JPEG frame here every 250ms."""
    if request.method == 'OPTIONS':
        response = Response()
        response['Access-Control-Allow-Origin'] = '*'
        response['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        response['Access-Control-Allow-Headers'] = 'Content-Type'
        return response

    frame_b64 = request.data.get('frame')
    if not frame_b64:
        return Response({'error': 'No frame'}, status=400)

    cache.set(f'vframe:{device_id}', frame_b64, timeout=5)
    cache.set(f'vframe_ts:{device_id}', time.time(), timeout=5)
    return Response({'ok': True})


@api_view(['GET'])
@permission_classes([AllowAny])
def get_frame(request, device_id):
    """Dashboard polls this every 250ms to get the latest frame."""
    frame_b64 = cache.get(f'vframe:{device_id}')
    ts = cache.get(f'vframe_ts:{device_id}')

    if not frame_b64:
        return Response({'frame': None, 'online': False})

    age = time.time() - (ts or 0)
    return Response({
        'frame': frame_b64,
        'online': age < 3.0,
        'age_ms': int(age * 1000),
    })
