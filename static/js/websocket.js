const turnify = {
    ws: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 3000,

    init() {
        this.connectWebSocket();
    },

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/turns/`;

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;
                this.requestUpdate('get_all');
            };

            this.ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleMessage(data);
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.attemptReconnect();
            };
        } catch (e) {
            console.error('WebSocket connection error:', e);
            this.attemptReconnect();
        }
    },

    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
            setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    },

    send(action, data = {}) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ action, ...data }));
        }
    },

    requestUpdate(type) {
        this.send(type);
    },

    handleMessage(data) {
        switch (data.type) {
            case 'all_turns':
                if (typeof updateTurnsList === 'function') {
                    updateTurnsList(data.turns);
                }
                this.updateDashboardStats(data.turns);
                break;
            case 'current_turn':
                if (typeof updateCurrentTurn === 'function') {
                    updateCurrentTurn(data);
                }
                this.updateScreenDisplay(data);
                break;
            case 'waiting_turns':
                this.updateWaitingCount(data.count);
                break;
            case 'user_position':
                if (typeof updateUserPositionWS === 'function') {
                    updateUserPositionWS(data);
                }
                break;
        }
    },

    updateDashboardStats(turns) {
        if (!document.getElementById('turnsList')) return;

        const waiting = turns.filter(t => t.status === 'waiting').length;
        const total = turns.length;
        const processed = turns.filter(t => t.status === 'completed').length;

        if (document.getElementById('waitingTurns')) {
            document.getElementById('waitingTurns').textContent = waiting;
        }
        if (document.getElementById('totalTurns')) {
            document.getElementById('totalTurns').textContent = total;
        }
        if (document.getElementById('processedToday')) {
            const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
            document.getElementById('processedToday').textContent = pct + '%';
        }

        if (document.getElementById('liveTurn') || document.getElementById('currentNumber')) {
            const current = turns.find(t => t.status === 'calling');
            if (current) {
                if (document.getElementById('liveTurn')) {
                    document.getElementById('liveTurn').textContent = current.number;
                }
                if (document.getElementById('currentNumber')) {
                    document.getElementById('currentNumber').textContent = current.number;
                }
            }
        }

        if (document.getElementById('nextTurn') || document.getElementById('nextTurnsDisplay')) {
            const nextTurns = turns.filter(t => t.status === 'waiting').slice(0, 5);
            if (document.getElementById('nextTurn')) {
                document.getElementById('nextTurn').textContent = nextTurns.length > 0 ? nextTurns[0].number : 'NINGUNO';
            }
            if (document.getElementById('nextTurnsDisplay')) {
                let html = nextTurns.length === 0
                    ? '<div class="empty-state">✓ Sin turnos esperando</div>'
                    : nextTurns.map(t => `<div class="next-turn-number">${t.number}</div>`).join('');
                document.getElementById('nextTurnsDisplay').innerHTML = html;
            }
        }

        if (document.getElementById('waitingCount')) {
            document.getElementById('waitingCount').textContent = waiting;
        }

        if (typeof updateTurnsList === 'function') {
            updateTurnsList(turns);
        }
    },

    updateWaitingCount(count) {
        if (document.getElementById('waitingCount')) {
            document.getElementById('waitingCount').textContent = count;
        }
    },

    updateScreenDisplay(data) {
        const currentEl = document.getElementById('currentNumber');
        if (currentEl) {
            currentEl.textContent = data.number || '---';
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => turnify.init());
} else {
    turnify.init();
}