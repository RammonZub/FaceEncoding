from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import User
import base64
import numpy as np
import cv2
import logging
from .face_encodings import check_front_looking
from django.db import transaction
import json
import time

# Configure logging to file if needed
logging.basicConfig(filename='debug.log', level=logging.DEBUG)
logger = logging.getLogger(__name__)

@csrf_exempt
def face_processing(request):
    message = "No operation performed."
    with transaction.atomic():
        if request.method == 'POST':
            position = request.POST.get('position')
            name = request.POST.get('name')
            surname = request.POST.get('surname')
            image_data = request.POST.get('image')

            if not image_data:
                return JsonResponse({'error': 'No image provided'}, status=400)

            format, imgstr = image_data.split(';base64,')
            data = base64.b64decode(imgstr)
            nparr = np.frombuffer(data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            correct, face_encoding, error, position_change_required = check_front_looking(image, position)

            if correct and face_encoding is not None:
                message = f"Position '{position}' is correct for {name} {surname}. Encodings captured successfully."
                logger.info(message)
                position_change_required = True
            else:
                message = f'Position {position} incorrect or encodings failed: {error}'
                logger.error(message)
                position_change_required = False
                
            #logger.debug("Face Encoding: %s", face_encoding)
            response_data = {
                    'correct': correct,
                    'face_encoding': face_encoding.tolist() if face_encoding is not None else None,
                    'error': error,
                    'position_change_required': position_change_required,
                    'message': message
                }
            #logger.debug("Attention FACE ENCODING BELOW")
            #logger.debug(response_data['face_encoding'])
            
            return JsonResponse(response_data)
        else:
            return JsonResponse({'error': 'This endpoint only supports POST requests.'}, status=405)




@csrf_exempt
def save_user(request):
    if request.method == 'POST':
        try:
            # Assuming the request content type is application/json
            data = json.loads(request.body)
            name = data['name']
            surname = data['surname']
            face_encoding = data['face_encoding']

            #logger.debug(data)
            #logger.debug(f"face encoding: {face_encoding}")

            face_encoding_list = data['face_encoding']
            
            #logger.debug("Face Encoding List: %s", face_encoding_list)

            user, created = User.objects.update_or_create(
                first_name=name,
                last_name=surname,
                defaults={'face_encodings': face_encoding_list}
            )
            message = f"User {'created' if created else 'updated'} successfully: {user.id}"
            logger.info(message)
            return JsonResponse({'message': message, 'user_id': user.id}, status=200)
        except KeyError as e:
            # It might be a good idea to catch KeyError specifically to return a more informative error
            logger.error(f'Missing key in data: {e}')
            return JsonResponse({'error': f'Missing key in data: {e}'}, status=400)
        except Exception as e:
            logger.exception("Exception occurred during user save.")
            return JsonResponse({'error': str(e)}, status=500)
    else:
        logger.warning("Non-POST request received")
        return JsonResponse({'error': 'This endpoint only supports POST requests.'}, status=405)