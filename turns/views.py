from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Turn
from .utils import generate_turn, get_turn_prefix
from .firebase_config import db
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import csv
import io
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
import pandas as pd

# Renderiza la pagina principal donde los usuarios pueden solicitar un turno
def home(request):
    return render(request,"home.html")

# Renderiza el panel de control del empleado (para llamar turnos)
def employee(request):
    return render(request,"employee.html")

# Renderiza la pantalla de affichage (muestra el turno actual)
def screen(request):
    return render(request,"screen.html")

# Renderiza el dashboard con estadisticas y reportes
def dashboard(request):
    return render(request,"dashboard.html")

# Crea un nuevo turno y lo guarda en la base de datos
# Parametros: service_type (general, preferential, emergency)
# Retorna: numero del turno creado
@api_view(['POST'])
def create_turn(request):
    service_type = request.data.get('service_type', 'general')
    prefix = get_turn_prefix(service_type)
    number = generate_turn(prefix)
    turn = Turn.objects.create(number=number, service_type=service_type)
    
    # Guardar el turno del usuario en la sesión
    request.session['user_turn'] = number

    if db:
        db.collection("turns").document(number).set({
        "number":number,
        "status":"waiting",
        "service_type": service_type
        })

    broadcast_turn_update()
    return Response({"number":number})

# Llama al siguiente turno de la cola (el mas antiguo en espera)
# Cambia su estado a "calling"
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

    broadcast_turn_update()
    return Response({"turn":turn.number})

# Obtiene todos los turnos del dia actual con su estado y tiempo de espera
# Retorna: lista de turnos con numero, status, fecha y tiempo de espera
@api_view(['GET'])
def get_all_turns(request):
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    turns = Turn.objects.filter(created_at__date=today).order_by('-created_at')
    now = timezone.now()
    
    data = []
    for t in turns:
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

# Marca un turno especifico como completado
# Parametros: number (numero del turno)
@api_view(['POST'])
def complete_turn(request):
    turn_number = request.data.get('number')
    turn = Turn.objects.filter(number=turn_number).first()
    if turn:
        turn.status = "completed"
        turn.save()
        
        if db:
            db.collection("turns").document(turn_number).update({
                "status": "completed"
            })
        
        broadcast_turn_update()
        return Response({"success": True, "message": f"Turn {turn_number} completed"})
    return Response({"success": False, "message": "Turn not found"}, status=404)

# Elimina todos los turnos de la base de datos (funcion de administrador)
@api_view(['POST'])
def reset_turns(request):
    Turn.objects.all().delete()
    
    if db:
        docs = db.collection("turns").stream()
        for doc in docs:
            doc.reference.delete()
    
    broadcast_turn_update()
    return Response({"success": True, "message": "All turns have been reset"})

# Elimina un turno especifico por su numero
# Parametros: turn_number (numero del turno a eliminar)
@api_view(['DELETE'])
def delete_turn(request, turn_number):
    turn = Turn.objects.filter(number=turn_number).first()
    
    if not turn:
        return Response({"success": False, "message": "Turn not found"}, status=404)
    
    turn_number = turn.number
    turn.delete()
    
    if db:
        db.collection("turns").document(turn_number).delete()
    
    broadcast_turn_update()
    return Response({"success": True, "message": f"{turn_number} has been deleted"})

# Obtiene el turno actualmente en atencion (status: calling)
# Retorna: numero del turno o null si no hay ninguno
@api_view(['GET'])
def get_current_turn(request):
    turn = Turn.objects.filter(status="calling").first()
    if turn:
        return Response({"number": turn.number, "status": turn.status})
    return Response({"number": None, "status": "none"})

# Obtiene todos los turnos en espera (status: waiting)
# Retorna: lista de turnos esperando con tiempo de espera
@api_view(['GET'])
def get_waiting_turns(request):
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

# Obtiene el siguiente turno a ser llamado (el primero en la cola)
# Retorna: numero del turno o null
@api_view(['GET'])
def get_next_turn(request):
    turn = Turn.objects.filter(status="waiting").first()
    if turn:
        return Response({"number": turn.number, "status": "waiting"})
    return Response({"number": None, "status": "none"})

# Llama a un turno especifico (no el siguiente de la cola)
# Parametros: number (numero del turno a llamar)
@api_view(['POST'])
def call_specific_turn(request):
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
    
    broadcast_turn_update()
    return Response({"success": True, "turn": turn.number})

# Termina el turno actual sin llamar al siguiente
# Cambia el estado a "completed" y limpia el turno activo
@api_view(['POST'])
def finish_current_turn(request):
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
    
    broadcast_turn_update()
    return Response({"success": True, "completed_turn": current.number})

# Obtiene la posicion del usuario en la cola de espera
# El numero de turno se guarda en la sesion del navegador
# Retorna: posicion (1 = siguiente), turnos adelante, estado
@api_view(['GET'])
def get_user_position(request):
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

# Envia actualizacion en tiempo real a todos los clientes WebSocket conectados
# Notifica sobre: todos los turnos, turno actual, turnos en espera
def broadcast_turn_update():
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            from django.utils import timezone
            
            today = timezone.now().date()
            turns = Turn.objects.filter(created_at__date=today).order_by('-created_at')
            now = timezone.now()
            
            all_data = []
            waiting_data = []
            for t in turns:
                if t.status == 'waiting' or t.status == 'calling':
                    wait_minutes = int((now - t.created_at).total_seconds() / 60)
                    wait_time = f"{wait_minutes} min"
                else:
                    wait_time = "-"
                
                turn_data = {
                    "number": t.number,
                    "status": t.status,
                    "created_at": t.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                    "wait_time": wait_time
                }
                all_data.append(turn_data)
                
                if t.status == 'waiting':
                    waiting_data.append(turn_data)
            
            current_turn = Turn.objects.filter(status="calling", created_at__date=today).first()
            current_data = {"number": current_turn.number, "status": current_turn.status} if current_turn else {"number": None, "status": "none"}
            
            waiting_count = len(waiting_data)
            
            async_to_sync(channel_layer.group_send)("turns_updates", {
                "type": "turn_update",
                "data": {"type": "all_turns", "turns": all_data}
            })
            async_to_sync(channel_layer.group_send)("turns_updates", {
                "type": "turn_update",
                "data": {"type": "current_turn", **current_data}
            })
            async_to_sync(channel_layer.group_send)("turns_updates", {
                "type": "turn_update",
                "data": {"type": "waiting_turns", "turns": waiting_data, "count": waiting_count}
            })
    except Exception as e:
        print(f"Broadcast error: {e}")

# Obtiene estadisticas completas del sistema
# Retorna: total turnos, hoy, esperando, llamando, completados, por tipo de servicio, promedio espera, ultimos 7 dias
@api_view(['GET'])
def get_statistics(request):
    now = timezone.now()
    today = now.date()
    
    total_turns = Turn.objects.count()
    today_turns = Turn.objects.filter(created_at__date=today).count()
    
    waiting_count = Turn.objects.filter(status="waiting").count()
    calling_count = Turn.objects.filter(status="calling").count()
    completed_count = Turn.objects.filter(status="completed").count()
    
    service_stats = {}
    for service in ['general', 'preferential', 'emergency']:
        count = Turn.objects.filter(service_type=service, created_at__date=today).count()
        service_stats[service] = count
    
    avg_wait_time = 0
    completed_today = Turn.objects.filter(status="completed", created_at__date=today)
    if completed_today.exists():
        wait_times = []
        for turn in completed_today:
            if turn.created_at:
                wait_time = (turn.created_at - now).total_seconds() / 60
                if wait_time > 0:
                    wait_times.append(wait_time)
        if wait_times:
            avg_wait_time = round(sum(wait_times) / len(wait_times), 1)
    
    last_7_days = []
    for i in range(7):
        day = today - timedelta(days=i)
        day_turns = Turn.objects.filter(created_at__date=day).count()
        last_7_days.append({
            "date": day.strftime('%Y-%m-%d'),
            "turns": day_turns
        })
    last_7_days.reverse()
    
    return Response({
        "total_turns": total_turns,
        "today_turns": today_turns,
        "waiting": waiting_count,
        "calling": calling_count,
        "completed": completed_count,
        "service_stats": service_stats,
        "avg_wait_time": avg_wait_time,
        "last_7_days": last_7_days
    })

# Exporta todos los turnos a formato CSV
# Descarga un archivo con todos los datos de turnos
@api_view(['GET'])
def export_csv(request):
    turns = Turn.objects.all().order_by('-created_at')
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="turnos_export.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Numero', 'Estado', 'Tipo de Servicio', 'Empleado Asignado', 'Fecha de Creacion', 'Tiempo de Espera'])
    
    now = timezone.now()
    for turn in turns:
        if turn.status in ['waiting', 'calling']:
            wait_minutes = int((now - turn.created_at).total_seconds() / 60)
        else:
            wait_minutes = 0
        
        writer.writerow([
            turn.number,
            turn.status,
            turn.service_type,
            turn.assigned_employee or 'No asignado',
            turn.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            f"{wait_minutes} min"
        ])
    
    return response

# Exporta todos los turnos a formato Excel (.xlsx)
# Descarga un archivo Excel con los datos
@api_view(['GET'])
def export_excel(request):
    turns = Turn.objects.all().order_by('-created_at')
    
    data = []
    now = timezone.now()
    for turn in turns:
        if turn.status in ['waiting', 'calling']:
            wait_minutes = int((now - turn.created_at).total_seconds() / 60)
        else:
            wait_minutes = 0
            
        data.append({
            'Numero': turn.number,
            'Estado': turn.status,
            'Tipo de Servicio': turn.service_type,
            'Empleado Asignado': turn.assigned_employee or 'No asignado',
            'Fecha de Creacion': turn.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'Tiempo de Espera (min)': wait_minutes
        })
    
    df = pd.DataFrame(data)
    
    response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="turnos_export.xlsx"'
    
    with io.BytesIO() as buffer:
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Turnos')
        
        buffer.seek(0)
        response.write(buffer.getvalue())
    
    return response

# Obtiene reportes del dia actual
# Incluye: turnos por estado, por tipo, por hora, tasa de completacion
@api_view(['GET'])
def get_reports(request):
    now = timezone.now()
    today = now.date()
    
    turns = Turn.objects.filter(created_at__date=today)
    
    status_summary = {}
    for status in ['waiting', 'calling', 'completed']:
        status_summary[status] = turns.filter(status=status).count()
    
    service_summary = {}
    for service in ['general', 'preferential', 'emergency']:
        service_summary[service] = turns.filter(service_type=service).count()
    
    hourly_stats = {}
    for hour in range(24):
        hour_turns = turns.filter(created_at__hour=hour).count()
        if hour_turns > 0:
            hourly_stats[f"{hour:02d}:00"] = hour_turns
    
    completion_rate = 0
    if turns.exists():
        completed = turns.filter(status='completed').count()
        completion_rate = round((completed / turns.count()) * 100, 1)
    
    return Response({
        "date": today.strftime('%Y-%m-%d'),
        "total_turns": turns.count(),
        "status_summary": status_summary,
        "service_summary": service_summary,
        "hourly_stats": hourly_stats,
        "completion_rate": completion_rate
    })