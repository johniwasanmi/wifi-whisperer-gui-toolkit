
from django.db import models
from django.utils import timezone
import uuid

class ScanSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    interface = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"ScanSession on {self.interface} ({self.id})"

class AttackSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attack_type = models.CharField(max_length=50)
    target_bssid = models.CharField(max_length=50)
    target_client = models.CharField(max_length=50, null=True, blank=True)
    interface = models.CharField(max_length=50)
    created_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.attack_type} Attack on {self.target_bssid} ({self.id})"
