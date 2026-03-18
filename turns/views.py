
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
    
    # Guardar el turno del usuario en la sesión
    request.session['user_turn'] = number

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
    from django.utils import timezone
    from datetime import timedelta
    
    turns = Turn.objects.all().order_by('-created_at')
    now = timezone.now()
    
    data = []
    for t in turns:
        # Calculate wait time
        if t.status == 'waiting' or t.status == 'calling':
            wait_minutes = int((now - t.created_at).total_seconds() / 60)
            wait_time = f"{wait_minutes} min"
        else:
            wait_time = "-"
        
        data.append({
            "number": t.number, 
            "status": t.status, 
            "created_at": t.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "wait_time": wait_time
        })
    
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

@api_view(['DELETE'])
def delete_turn(request, turn_number):
    """Delete a specific turn by number"""
    turn = Turn.objects.filter(number=turn_number).first()
    
    if not turn:
        return Response({"success": False, "message": "Turn not found"}, status=404)
    
    turn_number = turn.number
    turn.delete()
    
    if db:
        db.collection("turns").document(turn_number).delete()
    
    return Response({"success": True, "message": f"Turn {turn_number} has been deleted"})

@api_view(['GET'])
def get_current_turn(request):
    """Baracaldo: Get the currently active turn being called"""
    turn = Turn.objects.filter(status="calling").first()
    if turn:
        return Response({"number": turn.number, "status": turn.status})
    return Response({"number": None, "status": "none"})

@api_view(['GET'])
def get_waiting_turns(request):
    """Get all turns waiting to be called"""
    from django.utils import timezone
    
    turns = Turn.objects.filter(status="waiting").order_by('created_at')
    now = timezone.now()
    
    data = []
    for t in turns:
        wait_minutes = int((now - t.created_at).total_seconds() / 60)
        data.append({
            "number": t.number, 
            "status": t.status,
            "wait_time": f"{wait_minutes} min"
        })
    
    return Response({"turns": data, "count": len(data)})

@api_view(['GET'])
def get_next_turn(request):
    """Get the next turn to be called"""
    turn = Turn.objects.filter(status="waiting").first()
    if turn:
        return Response({"number": turn.number, "status": "waiting"})
    return Response({"number": None, "status": "none"})

@api_view(['POST'])
def call_specific_turn(request):
    """Call a specific turn by number"""
    turn_number = request.data.get('number')
    turn = Turn.objects.filter(number=turn_number, status="waiting").first()
    
    if not turn:
        return Response({"success": False, "message": "Turn not found or not waiting"}, status=404)
    
    # Mark as calling
    turn.status = "calling"
    turn.save()
    
    if db:
        db.collection("current").document("active").set({
            "number": turn.number
        })
    
    return Response({"success": True, "turn": turn.number})

@api_view(['POST'])
def finish_current_turn(request):
    """Finish the currently calling turn without calling next"""
    current = Turn.objects.filter(status="calling").first()
    if not current:
        return Response({"success": False, "message": "No active turn to finish"}, status=404)
    
    current.status = "completed"
    current.save()
    
    if db:
        db.collection("turns").document(current.number).update({
            "status": "completed"
        })
        # Clear current turn
        db.collection("current").document("active").set({"number": None})
    
    return Response({"success": True, "completed_turn": current.number})

@api_view(['GET'])
def get_user_position(request):
    """Get user's position in queue (stored in session or cookie)"""
    user_turn = request.session.get('user_turn')
    if not user_turn:
        return Response({"position": -1, "turns_ahead": -1, "message": "No turn assigned"})
    
    # Find user's turn
    user_turn_obj = Turn.objects.filter(number=user_turn).first()
    if not user_turn_obj:
        return Response({"position": -1, "turns_ahead": -1, "message": "Turn not found"})
    
    # Count turns ahead
    if user_turn_obj.status == "completed":
        return Response({"position": 0, "turns_ahead": 0, "status": "completed"})
    
    turns_ahead = Turn.objects.filter(
        created_at__lt=user_turn_obj.created_at,
        status__in=["waiting", "calling"]
    ).count()
    
    return Response({
        "position": turns_ahead + 1,
        "turns_ahead": turns_ahead,
        "status": user_turn_obj.status,
        "user_turn": user_turn
    })
