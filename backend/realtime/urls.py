from django.urls import path
from . import views

urlpatterns = [
    path('face_processing/', views.face_processing, name='face_processing'),
    path('save_user/', views.save_user, name='save_user'), 
]

