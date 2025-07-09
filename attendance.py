import cv2
import face_recognition
import numpy as np
import os
from datetime import datetime

# read all images from images folder
path = 'images'

images = []
classNames = []

img_files = os.listdir(path)

for cl in img_files:
    images.append(cv2.imread(f'{path}/{cl}'))
    classNames.append(os.path.splitext(cl)[0])

#print(classNames)

def findEncodings(images):
    encodeList = []

    for img in images:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        encoding = face_recognition.face_encodings(img)[0]
        encodeList.append(encoding)

    return encodeList

def markAttendance(name):
    with open('attendance.csv', 'r+') as f:
        dataList = f.readlines()
        nameList = set()

        for line in dataList:
            entry = line.split(',')
            nameList.add(entry[0])

        if name not in nameList:
            now = datetime.now()
            dtString = now.strftime('%H:%M:%S')
            f.writelines(f'\n{name},{dtString}')

encodeListKnown = findEncodings(images)
print('Encoding Complete')

cap = cv2.VideoCapture(0)

while True:
    success, img = cap.read()

    # reduce img scaling to 1/4 for efficiency
    imgS = cv2.resize(img, (0, 0), None, 0.25, 0.25)

    imgS = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    
    # track all locations of faces in the current frame
    facesLoc = face_recognition.face_locations(imgS)
    encodings = face_recognition.face_encodings(imgS, facesLoc)

    
    # for all faces in the current frame
    for faceEncoding, faceLocation in zip(encodings, facesLoc):
        matches = face_recognition.compare_faces(encodeListKnown, faceEncoding)
        faceDis = face_recognition.face_distance(encodeListKnown, faceEncoding)
        #print(faceDis)

        # find face with least distance
        matchIndex = np.argmin(faceDis)

        if matches[matchIndex]:
            name = classNames[matchIndex].upper()
            y1, x2, y2, x1 = faceLocation
            
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)

            # green background for text
            cv2.rectangle(img, (x1, y2-35), (x2, y2), (0, 255, 0), cv2.FILLED)

            # text of detected face name
            cv2.putText(img, name, (x1+6, y2 - 6), cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)

            markAttendance(name)

            
    
    cv2.imshow('Webcam', img)
    cv2.waitKey(1)

        
        






