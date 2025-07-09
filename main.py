import cv2
import face_recognition
import numpy as np

img = cv2.imread("images/lebron3.webp")
rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
img_encoding = face_recognition.face_encodings(rgb_img)[0]
face_loc = face_recognition.face_locations(img)[0]

img2 = cv2.imread("images/lebron.png")
rgb_img2 = cv2.cvtColor(img2, cv2.COLOR_BGR2RGB)
img_encoding2 = face_recognition.face_encodings(rgb_img2)[0]
face_loc2 = face_recognition.face_locations(img2)[0]

cv2.rectangle(img, (face_loc[3], face_loc[0]), (face_loc[1], face_loc[2]), (255, 0, 255), 2)
cv2.rectangle(img2, (face_loc2[3], face_loc2[0]), (face_loc2[1], face_loc2[2]), (255, 0, 255), 2)

results = face_recognition.compare_faces([img_encoding], img_encoding2)
faceDis = face_recognition.face_distance([img_encoding], img_encoding2)
print(results, faceDis) 

cv2.putText(img, f'{results[0]} {round(faceDis[0], 2)}', (50, 50), cv2.FONT_HERSHEY_COMPLEX, 1, (0, 0, 255), 2)

cv2.imshow("Img", img)
cv2.imshow("Img 2", img2)
cv2.waitKey(0)

