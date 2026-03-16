
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

@api_view(['GET'])
def get_all_turns(request):
    """Baracaldo: Get all turns with their current status"""
    turns = Turn.objects.all().order_by('-created_at')
    data = [{"number": t.number, "status": t.status, "created_at": t.created_at} for t in turns]
    return Response({"turns": data})

@api_view(['POST'])
def complete_turn(request):
    """Baracaldo: Mark a turn as completed"""
    turn_number = request.data.get('number')
    turn = Turn.objects.filter(number=turn_number).first()
    if turn:
        turn.status = "completed"
        turn.save()
        
        if db:
            db.collection("turns").document(turn_number).update({
                "status": "completed"
            })
        
        return Response({"success": True, "message": f"Turn {turn_number} completed"})
    return Response({"success": False, "message": "Turn not found"}, status=404)

@api_view(['POST'])
def reset_turns(request):
    """Baracaldo: Reset all turns (admin function)"""
    Turn.objects.all().delete()
    
    if db:
        docs = db.collection("turns").stream()
        for doc in docs:
            doc.reference.delete()
    
    return Response({"success": True, "message": "All turns have been reset"})

@api_view(['GET'])
def get_current_turn(request):
    """Baracaldo: Get the currently active turn being called"""
    turn = Turn.objects.filter(status="calling").first()
    if turn:
        return Response({"number": turn.number, "status": turn.status})
    return Response({"number": None, "status": "none"})
