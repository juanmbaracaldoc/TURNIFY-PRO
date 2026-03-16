"""
Turn statistics and analytics module
Author: Nicolas Ruiz
"""
from django.db.models import Count, Avg
from .models import Turn

def get_turn_statistics():
    """Calculate statistics for turn management"""
    total_turns = Turn.objects.count()
    waiting_turns = Turn.objects.filter(status='waiting').count()
    in_progress = Turn.objects.filter(status='in_progress').count()
    completed = Turn.objects.filter(status='completed').count()
    
    return {
        'total': total_turns,
        'waiting': waiting_turns,
        'in_progress': in_progress,
        'completed': completed,
        'average_wait_time': calculate_average_wait_time()
    }

def calculate_average_wait_time():
    """Calculate average wait time for completed turns"""
    # This would calculate based on timestamps
    return 0  # Placeholder

def get_service_type_distribution():
    """Get distribution of turns by service type"""
    return Turn.objects.values('service_type').annotate(count=Count('id'))
