import face_recognition
import cv2
import numpy as np
import mediapipe as mp
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def is_image_quality_sufficient(image):
    # Convert to grayscale for quality checks
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Blurriness check
    fm = cv2.Laplacian(gray, cv2.CV_64F).var()
    if fm < 100:
        return False, "Image is too blurry"
    
    # Brightness check
    brightness = np.mean(gray)
    if brightness < 50 or brightness > 200:
        return False, "Image brightness is not ideal"
    
    return True, ""



mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(min_detection_confidence=0.6, min_tracking_confidence=0.6)
mp_drawing = mp.solutions.drawing_utils
drawing_spec = mp_drawing.DrawingSpec(thickness=1, circle_radius=1)

y_pos_sideways = 8
y_neg_sideways = -8



def check_front_looking(image, position):
    global y_pos_sideways, y_neg_sideways
    
    logger.debug("Starting check_front_looking function")
    print("SEARCHING FOR POSITION: ", position)
    correct = False
    face_encoding = None
    error = None

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    image.flags.writeable = False
    results = face_mesh.process(image)
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)

    img_h, img_w, _ = image.shape
    face_3d = []
    face_2d = []

    if results.multi_face_landmarks:
        for face_landmarks in results.multi_face_landmarks:
            for idx, lm in enumerate(face_landmarks.landmark):
                # if idx == 33 or idx == 263 or idx == 1 or idx == 61 or idx == 291 or idx == 199:
                #     if idx == 1:
                #         nose_2d = (lm.x * img_w, lm.y * img_h)
                #         nose_3d = (lm.x * img_w, lm.y * img_h, lm.z * 3000)
                    x, y = int(lm.x * img_w), int(lm.y * img_h)
                    face_2d.append([x, y])
                    face_3d.append([x, y, lm.z])

        face_2d = np.array(face_2d, dtype=np.float64)
        face_3d = np.array(face_3d, dtype=np.float64)

        focal_length = 1 * img_w
        cam_matrix = np.array([ [focal_length, 0, img_h / 2],
                                    [0, focal_length, img_w / 2],
                                    [0, 0, 1]])

        # The distortion parameters
        dist_matrix = np.zeros((4, 1), dtype=np.float64)
        
        # Solve PnP
        success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_matrix)
        # Get rotational matrix
        rmat, jac = cv2.Rodrigues(rot_vec)
        # Get angles
        angles, mtxR, mtxQ, Qx, Qy, Qz = cv2.RQDecomp3x3(rmat)

        # Get the y rotation degree
        x = angles[0] * 360
        y = angles[1] * 360
        z = angles[2] * 360
        
        angles = [x, y, z]
        #logger.debug("Detected angles: x=%s, y=%s, z=%s", angles[0], angles[1], angles[2])
        logger.debug("pos: %s", y_pos_sideways)
        logger.debug("neg: %s", y_neg_sideways)
            
        if position == 'front' and -10 <= y <= 10 and -4 <= x <= 4:
            correct = True
            if y > 6:
                y_pos_sideways = y * 1.4
                y_neg_sideways = y_pos_sideways * -1
                #logger.debug("y_pos_sideways updated: %s", y_pos_sideways)
            elif y < -6:
                y_neg_sideways = y * 1.4
                y_pos_sideways = y_neg_sideways * -1
                #logger.debug("y_neg_sideways updated: %s", y_neg_sideways)
            elif -6 <= y <= -4 or 4 <= y <= 6:
                y_pos_sideways = 6.5
                y_neg_sideways = -6.5
            else:
                y_pos_sideways = 8
                y_neg_sideways = -8
        elif position == 'sideways' and y_pos_sideways < y and -6 <= x <= 6:
            correct = True
        elif position == 'sideways' and y_neg_sideways >= y and (-3.5 <= x <= 6):
            correct = True
        elif position == 'down' and x <= -8 and ((y_neg_sideways +2) <= y <= (y_pos_sideways+2)):
            correct = True
        else:
            error = f"Detected angles not suitable for position '{position}'. Detected angles: {angles}"
            correct = False

        if correct:
            logger.debug("Correct position: %s", position)
            logger.debug("Correct angles: %s", angles)
            quality_ok, quality_msg = is_image_quality_sufficient(image)
            if quality_ok:
                face_encodings = face_recognition.face_encodings(image)
                if len(face_encodings) > 0:
                    face_encoding = face_encodings[0]
                    #logger.debug("FACE ENCODING SUCCESSFUL: %s", face_encoding)
                elif len(face_encodings) == 0:
                    error = "No face encodings found, despite quality and angle checks."
                    correct = False
            else:
                error = quality_msg
                correct = False

    return correct, face_encoding, error, correct