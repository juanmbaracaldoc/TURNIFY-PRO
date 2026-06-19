from django.db import models

class Turn(models.Model):
    number=models.CharField(max_length=10)
    status=models.CharField(max_length=20,default="waiting")
    priority=models.IntegerField(default=0, help_text="Priority level for VIP customers")
    service_type=models.CharField(max_length=50, default="general", help_text="Type of service: general, preferential, emergency")
    assigned_employee=models.CharField(max_length=100, blank=True, help_text="Employee assigned to this turn")
    created_at=models.DateTimeField(auto_now_add=True)
    required_documents=models.JSONField(default=list, blank=True, help_text="Documents required by employee")
    uploaded_documents=models.JSONField(default=list, blank=True, help_text="Documents uploaded by user")
    def __str__(self):
        return self.number
