
from django.urls import path
from . import views

urlpatterns=[
    path("",views.home),
    path("employee/",views.employee),
    path("screen/",views.screen),
    path("dashboard/",views.dashboard),
    path("api/create/",views.create_turn),
    path("api/call/",views.call_next),
    path("api/priority/",views.get_priority_turns, name="priority_turns"),
]
