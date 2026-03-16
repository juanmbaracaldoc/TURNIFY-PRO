
from .models import Turn
def generate_turn():
    last=Turn.objects.last()
    if not last:
        return "A1"
    num=int(last.number[1:])+1
    return f"A{num}"

def get_turn_prefix(service_type="general"):
    """Baracaldo: Get prefix based on service type"""
    prefixes = {
        "general": "A",
        "preferential": "B",
        "vip": "V",
        "emergency": "E"
    }
    return prefixes.get(service_type, "A")
