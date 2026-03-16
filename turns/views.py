
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Turn
from .utils import generate_turn
from .firebase_config import db

def home(request):
    return render(request,"home.html")

def employee(request):
    return render(request,"employee.html")

def screen(request):
    return render(request,"screen.html")

def dashboard(request):
    return render(request,"dashboard.html")

@api_view(['POST'])
def create_turn(request):
    number=generate_turn()
    turn=Turn.objects.create(number=number)

    if db:
        db.collection("turns").document(number).set({
        "number":number,
        "status":"waiting"
        })

    return Response({"number":number})

@api_view(['POST'])
def call_next(request):
    turn=Turn.objects.filter(status="waiting").first()
    if not turn:
        return Response({"turn":None})

    turn.status="calling"
    turn.save()

    if db:
        db.collection("current").document("active").set({
        "number":turn.number
        })

    return Response({"turn":turn.number})
