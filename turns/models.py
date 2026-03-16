
from django.db import models

class Turn(models.Model):
    number=models.CharField(max_length=10)
    status=models.CharField(max_length=20,default="waiting")
    priority=models.IntegerField(default=0, help_text="Priority level for VIP customers")
    created_at=models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.number
