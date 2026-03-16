
from .models import Turn
def generate_turn():
    last=Turn.objects.last()
    if not last:
        return "A1"
    num=int(last.number[1:])+1
    return f"A{num}"
