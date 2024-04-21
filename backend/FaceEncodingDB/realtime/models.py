from django.db import models

class User(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    face_encodings = models.JSONField(default=list)
    front_image = models.ImageField(upload_to='front_poses/', blank=True, null=True)
    side_image = models.ImageField(upload_to='side_poses/', blank=True, null=True)
    down_image = models.ImageField(upload_to='down_poses/', blank=True, null=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
