from django.shortcuts import render, redirect
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count
from .models import Turn, Register
from .utils import generate_turn, get_turn_prefix
from .firebase_config import db
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import csv
import io
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta, date
import pandas as pd
from django.contrib.auth.hashers import make_password, check_password
import json

def home(request):
    if 'turnify_user' not in request.session:
        return redirect('/login/')
    if request.session.get('turnify_role') != 'client':
        return redirect('/login/')
    return render(request, "home.html")

def employee(request):
    if 'turnify_user' not in request.session:
        return redirect('/login/')
    if request.session.get('turnify_role') != 'admin':
        return redirect('/login/')
    return render(request, "employee.html")

def screen(request):
    return render(request, "screen.html")

def dashboard(request):
    if 'turnify_user' not in request.session:
        return redirect('/login/')
    if request.session.get('turnify_role') != 'admin':
        return redirect('/login/')
    total_users = Register.objects.filter(role='client').count()
    employees = Register.objects.filter(role='employee')
    context = {'total_users': total_users, 'employees': employees}
    return render(request, 'dashboard.html', context)

def register_page(request):
    users = list(Register.objects.all().values_list('username', flat=True))
    return render(request, 'register.html', {'existing_users': users})

def login_page(request):
    users = list(Register.objects.all().values_list('username', flat=True))
    return render(request, 'login.html', {'existing_users': users})

def logout_page(request):
    request.session.flush()
    return redirect('/login/')

@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    confirm_password = request.data.get('confirm_password', '').strip()
    full_name = request.data.get('full_name', '').strip()
    cedula = request.data.get('cedula', '').strip()
    email = request.data.get('email', '').strip()
    phone = request.data.get('phone', '').strip()

    if not username or not password:
        return Response({'success': False, 'message': 'Usuario y contraseña requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({'success': False, 'message': 'Las contraseñas no coinciden'}, status=status.HTTP_400_BAD_REQUEST)

    if Register.objects.filter(username=username).exists():
        return Response({'success': False, 'message': 'El usuario ya existe'}, status=status.HTTP_409_CONFLICT)

    hashed_password = make_password(password)
    Register.objects.create(
        username=username,
        password=hashed_password,
        full_name=full_name,
        cedula=cedula,
        email=email,
        phone=phone
    )

    if db:
        try:
            db.collection("users").document(username).set({
                'username': username,
                'full_name': full_name,
                'cedula': cedula,
                'email': email,
                'phone': phone,
                'role': 'client',
                'created_at': timezone.now().isoformat(),
                'updated_at': timezone.now().isoformat()
            })
        except Exception as e:
            pass

    return Response({'success': True, 'message': 'Usuario registrado correctamente', 'user': {'username': username, 'role': 'client'}})

@api_view(['POST'])
@permission_classes([AllowAny])
def login_user(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()

    if not username or not password:
        return Response({'success': False, 'message': 'Usuario y contraseña requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    register = Register.objects.filter(username=username).first()
    if not register or not check_password(password, register.password):
        return Response({'success': False, 'message': 'Credenciales inválidas'}, status=status.HTTP_401_UNAUTHORIZED)

    request.session['turnify_user'] = username
    request.session['turnify_role'] = register.role

    if db:
        try:
            db.collection("users").document(username).update({
                'last_login': timezone.now().isoformat(),
                'role': register.role
            })
        except Exception as e:
            pass

    redirect_url = '/' if register.role == 'client' else '/dashboard/'

    return Response({'success': True, 'redirect_url': redirect_url, 'user': {'username': username, 'role': register.role}})

@api_view(['POST'])
def logout_user(request):
    if 'turnify_user' in request.session:
        del request.session['turnify_user']
    if 'turnify_role' in request.session:
        del request.session['turnify_role']
    return Response({'success': True, 'message': 'Sesión cerrada correctamente'})

@api_view(['GET'])
def get_users(request):
    users = Register.objects.all().order_by('-created_at')
    data = [{'username': u.username, 'role': u.role, 'created_at': u.created_at.strftime('%Y-%m-%d %H:%M:%S')} for u in users]
    return Response({'users': data})

@api_view(['DELETE'])
def delete_user(request, username):
    register = Register.objects.filter(username=username).first()
    if not register:
        return Response({'success': False, 'message': 'Usuario no encontrado'}, status=status.HTTP_404_NOT_FOUND)

    username_to_delete = register.username
    register.delete()

    if db:
        try:
            db.collection("users").document(username_to_delete).delete()
        except Exception as e:
            pass

    return Response({'success': True, 'message': f'Usuario {username_to_delete} eliminado correctamente'})

@api_view(['POST'])
def create_employee(request):
    username = request.data.get('username', '').strip()
    password = request.data.get('password', '').strip()
    full_name = request.data.get('full_name', '').strip()

    if not username or not password:
        return Response({'success': False, 'message': 'Usuario y contraseña requeridos'}, status=status.HTTP_400_BAD_REQUEST)

    if Register.objects.filter(username=username).exists():
        return Response({'success': False, 'message': 'El usuario ya existe'}, status=status.HTTP_409_CONFLICT)

    hashed_password = make_password(password)
    Register.objects.create(
        username=username,
        password=hashed_password,
        full_name=full_name,
        role='employee'
    )

    if db:
        try:
            db.collection("users").document(username).set({
                'username': username,
                'full_name': full_name,
                'role': 'employee',
                'created_at': timezone.now().isoformat(),
                'updated_at': timezone.now().isoformat()
            })
        except Exception as e:
            pass

    return Response({'success': True, 'message': 'Empleado creado correctamente', 'user': {'username': username, 'role': 'employee'}})

@api_view(['GET'])
def get_employees(request):
    employees = Register.objects.filter(role='employee')
    data = [{'username': e.username, 'full_name': e.full_name, 'created_at': e.created_at.strftime('%Y-%m-%d %H:%M:%S')} for e in employees]
    return Response({'employees': data})

@api_view(['POST'])
def create_turn(request):
    service_type = request.data.get('service_type', 'general')
    user_name = request.session.get('turnify_user', '')

    prefix = get_turn_prefix(service_type)
    number = generate_turn(prefix)

    client_data = {}
    if user_name:
        client = Register.objects.filter(username=user_name).first()
        if client:
            client_data = {
                'full_name': client.full_name,
                'cedula': client.cedula,
                'email': client.email,
                'phone': client.phone
            }

    Turn.objects.create(number=number, service_type=service_type)

    request.session['user_turn'] = number

    if db:
        db.collection("turns").document(number).set({
            "number": number,
            "status": "waiting",
            "service_type": service_type,
            "client_data": client_data
        })

    broadcast_turn_update()
    return Response({"number": number})

def broadcast_turn_update():
    turns = Turn.objects.all().order_by('-created_at')
    turns_data = []
    for t in turns:
        turns_data.append({
            'number': t.number,
            'status': t.status,
            'service_type': t.service_type,
            'created_at': t.created_at.strftime('%H:%M') if t.created_at else ''
        })
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)('turns', {'type': 'turn_update', 'turns': turns_data})

@api_view(['POST'])
def call_next(request):
    service_type = request.data.get('service_type', 'general')
    turn = Turn.objects.filter(status='waiting', service_type=service_type).order_by('created_at').first()
    if turn:
        turn.status = 'called'
        turn.save()
        if db:
            db.collection('turns').document(turn.number).update({'status': 'called'})
        broadcast_turn_update()
        return Response({'number': turn.number})
    return Response({'message': 'No turns waiting'}, status=200)

@api_view(['GET'])
def get_all_turns(request):
    turns = Turn.objects.all().order_by('-created_at')
    turns_data = []
    for t in turns:
        turns_data.append({
            'number': t.number,
            'status': t.status,
            'service_type': t.service_type,
            'created_at': t.created_at.strftime('%H:%M') if t.created_at else ''
        })
    return Response({'turns': turns_data})

@api_view(['GET'])
def get_current_turn(request):
    turn = Turn.objects.filter(status='called').order_by('-created_at').first()
    if turn:
        return Response({'number': turn.number, 'service_type': turn.service_type})
    return Response({'number': None})

@api_view(['GET'])
def get_waiting_turns(request):
    service_type = request.GET.get('service_type', 'general')
    turns = Turn.objects.filter(status='waiting', service_type=service_type).order_by('created_at')
    turns_data = []
    for t in turns:
        turns_data.append({
            'number': t.number,
            'service_type': t.service_type
        })
    return Response({'turns': turns_data})

@api_view(['GET'])
def get_next_turn(request):
    service_type = request.GET.get('service_type', 'general')
    turn = Turn.objects.filter(status='waiting', service_type=service_type).order_by('created_at').first()
    if turn:
        return Response({'number': turn.number})
    return Response({'number': None})

@api_view(['POST'])
def finish_current_turn(request):
    turn = Turn.objects.filter(status='called').order_by('-created_at').first()
    if turn:
        turn.status = 'finished'
        turn.finished_at = timezone.now()
        turn.save()
        if db:
            db.collection('turns').document(turn.number).update({'status': 'finished', 'finished_at': timezone.now().isoformat()})
        broadcast_turn_update()
        return Response({'number': turn.number})
    return Response({'message': 'No turn in progress'}, status=200)

@api_view(['POST'])
def call_specific_turn(request):
    turn_number = request.data.get('turn_number', '')
    turn = Turn.objects.filter(number=turn_number).first()
    if turn:
        turn.status = 'called'
        turn.save()
        if db:
            db.collection('turns').document(turn.number).update({'status': 'called'})
        broadcast_turn_update()
        return Response({'number': turn.number})
    return Response({'message': 'Turn not found'}, status=404)

@api_view(['GET'])
def get_user_position(request):
    turn_number = request.GET.get('turn_number', '')
    if not turn_number:
        return Response({'position': None})
    turns = Turn.objects.filter(status='waiting', service_type='general').order_by('created_at')
    position = None
    for i, t in enumerate(turns, 1):
        if t.number == turn_number:
            position = i
            break
    return Response({'position': position})

@api_view(['POST'])
def complete_turn(request):
    turn_number = request.data.get('turn_number', '')
    turn = Turn.objects.filter(number=turn_number).first()
    if turn:
        turn.status = 'finished'
        turn.finished_at = timezone.now()
        turn.save()
        if db:
            db.collection('turns').document(turn.number).update({'status': 'finished', 'finished_at': timezone.now().isoformat()})
        broadcast_turn_update()
        return Response({'number': turn.number})
    return Response({'message': 'Turn not found'}, status=404)

@api_view(['DELETE'])
def delete_turn(request, turn_number):
    if db:
        try:
            db.collection('turns').document(turn_number).delete()
        except:
            pass
    Turn.objects.filter(number=turn_number).delete()
    broadcast_turn_update()
    return Response({'success': True})

@api_view(['POST'])
def reset_turns(request):
    Turn.objects.all().delete()
    if db:
        turns_ref = db.collection('turns')
        for doc in turns_ref.stream():
            doc.reference.delete()
    broadcast_turn_update()
    return Response({'success': True, 'message': 'Turnos eliminados'})

@api_view(['GET'])
def get_statistics(request):
    from .statistics import get_turn_statistics
    stats = get_turn_statistics()
    return Response(stats)

@api_view(['GET'])
def get_reports(request):
    today = date.today()
    turns = Turn.objects.filter(created_at__date=today).values('service_type').annotate(count=Count('id'))
    return Response({'reports': list(turns)})

@api_view(['GET'])
def export_csv(request):
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['number', 'status', 'service_type', 'created_at'])
    for turn in Turn.objects.all().values_list('number', 'status', 'service_type', 'created_at'):
        writer.writerow(turn)
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="turns.csv"'
    return response

@api_view(['GET'])
def export_excel(request):
    df = pd.DataFrame(list(Turn.objects.values('number', 'status', 'service_type', 'created_at')))
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    response['Content-Disposition'] = 'attachment; filename="turns.xlsx"'
    return response

@api_view(['POST'])
def set_required_documents(request):
    required = request.data.get('required_documents', [])
    if db:
        db.collection('config').document('documents').set({'required': required}, merge=True)
    return Response({'success': True})

@api_view(['POST'])
def upload_document(request):
    turn_number = request.data.get('turn_number', '')
    document_url = request.data.get('document_url', '')
    turn = Turn.objects.filter(number=turn_number).first()
    if turn:
        turn.uploaded_documents = document_url
        turn.save()
        return Response({'success': True})
    return Response({'success': False, 'message': 'Turn not found'}, status=404)