// WebSocket manager - comunicación en tiempo real
const websocketManager = {
    ws: null,
    reconnectAttempts: 0,
    maxReconnectAttempts: 5,
    reconnectDelay: 2000,
    connected: false,

    init() {
        this.connectWebSocket();
    },

    connectWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/turns/`;

        console.log('Conectando a WebSocket:', wsUrl);

        try {
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('✅ WebSocket conectado');
                this.reconnectAttempts = 0;
                this.connected = true;
                this.requestUpdate('get_all');
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (e) {
                    console.log('Mensaje WebSocket:', event.data);
                }
            };

            this.ws.onerror = (error) => {
                console.log('WebSocket error (fallback: polling)');
                this.connected = false;
            };

            this.ws.onclose = () => {
                this.connected = false;
                console.log('WebSocket desconectado, intentando reconectar...');
                if (this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    setTimeout(() => this.connectWebSocket(), this.reconnectDelay);
                }
            };
        } catch (e) {
            console.log('WebSocket no disponible, usando polling');
            this.connected = false;
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
                if (turnify) turnify.handleWebSocketUpdate(data);
                break;
            case 'current_turn':
                if (typeof updateCurrentTurn === 'function') {
                    updateCurrentTurn(data);
                }
                break;
            case 'waiting_turns':
                break;
            case 'user_position':
                if (typeof updateUserPositionWS === 'function') {
                    updateUserPositionWS(data);
                }
                break;
            case 'turn_update':
                if (data.data && turnify) turnify.handleWebSocketUpdate(data.data);
                break;
        }
    },

    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }
};

function initWebSocket() {
    if (typeof turnify !== 'undefined' && turnify instanceof TurnifyData) {
        websocketManager.init();
    } else {
        setTimeout(initWebSocket, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebSocket);
} else {
    initWebSocket();
}