
from django.urls import path
from . import views

urlpatterns=[
    path("",views.home),
    path("employee/",views.employee),
    path("screen/",views.screen),
    path("dashboard/",views.dashboard),
    path("api/create/",views.create_turn),
    path("api/call/",views.call_next),
    path("api/all/",views.get_all_turns),
    path("api/current/",views.get_current_turn),
    path("api/waiting/",views.get_waiting_turns),
    path("api/next/",views.get_next_turn),
    path("api/finish/",views.finish_current_turn),
    path("api/call-specific/",views.call_specific_turn),
    path("api/position/",views.get_user_position),
    path("api/complete/",views.complete_turn),
    path("api/delete/<str:turn_number>/",views.delete_turn, name='delete_turn'),
    path("api/reset/",views.reset_turns),
    path("api/statistics/",views.get_statistics),
    path("api/reports/",views.get_reports),
    path("api/export/csv/",views.export_csv),
    path("api/export/excel/",views.export_excel),
]
