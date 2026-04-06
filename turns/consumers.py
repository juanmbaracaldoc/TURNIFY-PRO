import json
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from datetime import timedelta

class TurnConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_group_name = 'turns_updates'
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        await self.send_current_turn()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')

        if action == 'get_current':
            await self.send_current_turn()
        elif action == 'get_all':
            await self.send_all_turns()
        elif action == 'get_waiting':
            await self.send_waiting_turns()
        elif action == 'get_position':
            user_turn = data.get('user_turn')
            await self.send_user_position(user_turn)

    async def send_current_turn(self):
        from turns.models import Turn
        turn = await self.get_current_turn()
        if turn:
            await self.send(text_data=json.dumps({
                'type': 'current_turn',
                'number': turn['number'],
                'status': turn['status']
            }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'current_turn',
                'number': None,
                'status': 'none'
            }))

    @database_sync_to_async
    def get_current_turn(self):
        from turns.models import Turn
        turn = Turn.objects.filter(status="calling").first()
        if turn:
            return {'number': turn.number, 'status': turn.status}
        return None

    async def send_all_turns(self):
        turns = await self.get_all_turns_data()
        await self.send(text_data=json.dumps({
            'type': 'all_turns',
            'turns': turns
        }))

    @database_sync_to_async
    def get_all_turns_data(self):
        from turns.models import Turn
        turns = Turn.objects.all().order_by('-created_at')
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
        return data

    async def send_waiting_turns(self):
        turns = await self.get_waiting_turns_data()
        await self.send(text_data=json.dumps({
            'type': 'waiting_turns',
            'turns': turns,
            'count': len(turns)
        }))

    @database_sync_to_async
    def get_waiting_turns_data(self):
        from turns.models import Turn
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
        return data

    async def send_user_position(self, user_turn):
        if not user_turn:
            await self.send(text_data=json.dumps({
                'type': 'user_position',
                'position': -1,
                'turns_ahead': -1,
                'message': 'No turn assigned'
            }))
            return

        position_data = await self.get_position_data(user_turn)
        await self.send(text_data=json.dumps({
            'type': 'user_position',
            **position_data
        }))

    @database_sync_to_async
    def get_position_data(self, user_turn):
        from turns.models import Turn
        user_turn_obj = Turn.objects.filter(number=user_turn).first()
        if not user_turn_obj:
            return {'position': -1, 'turns_ahead': -1, 'message': 'Turn not found'}

        if user_turn_obj.status == "completed":
            return {'position': 0, 'turns_ahead': 0, 'status': 'completed'}

        turns_ahead = Turn.objects.filter(
            created_at__lt=user_turn_obj.created_at,
            status__in=["waiting", "calling"]
        ).count()

        return {
            'position': turns_ahead + 1,
            'turns_ahead': turns_ahead,
            'status': user_turn_obj.status,
            'user_turn': user_turn
        }

    async def turn_update(self, event):
        await self.send(text_data=json.dumps(event['data']))