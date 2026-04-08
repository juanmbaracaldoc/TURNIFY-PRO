// Turnify Pro - Real-Time Turn Data Management

class TurnifyData {
    constructor() {
        this.turns = [];
        this.currentTurn = null;
        this.stats = { waiting: 0, totalToday: 0, processed: 0 };
        this.init();
    }

    async init() {
        await this.fetchTurns();
        
        if (document.getElementById('turnsList')) {
            this.updateDashboard();
        }
        if (document.getElementById('currentTurn')) {
            this.updateEmployee();
        }
        
        // Polling as primary (more reliable)
        setInterval(() => this.refresh(), 2000);
    }

    async refresh() {
        await this.fetchTurns();
        
        if (document.getElementById('turnsList')) {
            this.updateDashboard();
        }
        if (document.getElementById('currentTurn')) {
            this.updateEmployee();
        }
        
        // Also trigger WebSocket update if connected
        if (typeof turnify !== 'undefined' && turnify.ws && turnify.ws.readyState === WebSocket.OPEN) {
            turnify.send('get_all');
        }
    }

    async fetchTurns() {
        try {
            const response = await fetch('/api/all/');
            if (!response.ok) throw new Error('API error');
            const data = await response.json();
            this.turns = data.turns || [];
            
            const callingTurn = this.turns.find(t => t.status === 'calling');
            this.currentTurn = callingTurn || null;
            
            this.updateStats();
            this.updateUI();
        } catch (error) {
            console.log('Error fetching turns:', error);
            // NO usar datos de demo - dejar vacío
            this.turns = [];
            this.currentTurn = null;
            this.stats = { waiting: 0, totalToday: 0, processed: 0 };
            this.updateStats();
        }
    }

    updateStats() {
        this.stats.waiting = this.turns.filter(t => t.status === 'waiting').length;
        this.stats.totalToday = this.turns.length;
        this.stats.processed = this.turns.filter(t => t.status === 'completed').length;
    }

    updateUI() {
        // Update screen
        if (document.getElementById('currentNumber')) {
            const current = this.turns.find(t => t.status === 'calling');
            document.getElementById('currentNumber').textContent = current?.number || '---';
        }
        if (document.getElementById('waitingCount')) {
            document.getElementById('waitingCount').textContent = this.stats.waiting;
        }
        
        // Update screen next turns
        const nextDisplay = document.getElementById('nextTurnsDisplay');
        if (nextDisplay) {
            const waitingTurns = this.turns.filter(t => t.status === 'waiting').slice(0, 5);
            if (waitingTurns.length === 0) {
                nextDisplay.innerHTML = '<div class="empty-state">✓ Sin turnos esperando</div>';
            } else {
                nextDisplay.innerHTML = waitingTurns.map(t => `<div class="next-turn-number">${t.number}</div>`).join('');
            }
        }
    }

    handleWebSocketUpdate(data) {
        if (data.type === 'all_turns' && data.turns) {
            this.turns = data.turns;
            const callingTurn = this.turns.find(t => t.status === 'calling');
            this.currentTurn = callingTurn || null;
            this.updateStats();
            
            if (document.getElementById('turnsList')) {
                this.updateDashboard();
            }
            if (document.getElementById('currentTurn')) {
                this.updateEmployee();
            }
            this.updateUI();
        }
    }

    useDemoData() {
        this.turns = Array.from({length: 15}, (_, i) => ({
            id: i,
            number: `A${String(200+i).padStart(3,'0')}`,
            status: ['waiting', 'calling', 'completed'][Math.floor(Math.random()*3)],
            created_at: new Date(Date.now() - Math.random()*24*60*60*1000).toLocaleString('es-ES'),
            wait_time: `${Math.floor(Math.random()*45)} min`
        }));
        this.currentTurn = this.turns.find(t => t.status === 'calling') || this.turns[0];
        this.updateStats();
    }

    updateStats() {
        this.stats.waiting = this.turns.filter(t => t.status === 'waiting').length;
        this.stats.totalToday = this.turns.length;
        this.stats.processed = this.turns.filter(t => t.status === 'completed').length;
    }

    // Update Employee Panel
    updateEmployee() {
        // Update stats
        const waitingEl = document.getElementById('waitingCount');
        const totalEl = document.getElementById('totalToday');
        const processedEl = document.getElementById('processedToday');
        const currentTurnEl = document.getElementById('currentTurn');
        const currentStatusEl = document.getElementById('currentStatus');
        const queueCountEl = document.getElementById('queueCount');
        const waitingQueueEl = document.getElementById('waitingQueue');
        const callBtnEl = document.getElementById('callBtn');
        const finishBtnEl = document.getElementById('finishBtn');

        if (waitingEl) waitingEl.textContent = this.stats.waiting;
        if (totalEl) totalEl.textContent = this.stats.totalToday;
        if (processedEl) processedEl.textContent = this.stats.processed;

        // Update current turn
        if (currentTurnEl) {
            currentTurnEl.textContent = this.currentTurn?.number || '--';
        }
        
        // Update current status
        if (currentStatusEl) {
            if (this.currentTurn) {
                currentStatusEl.innerHTML = `<span style="color: #333; font-weight: bold;">🔔 LLAMANDO: ${this.currentTurn.number}</span>`;
            } else {
                currentStatusEl.innerHTML = `<span style="color: #666;">Esperando turno...</span>`;
            }
        }

        // Update queue count
        if (queueCountEl) {
            queueCountEl.textContent = `${this.stats.waiting} turnos`;
        }

        // Update waiting queue list
        if (waitingQueueEl) {
            const waitingTurns = this.turns.filter(t => t.status === 'waiting').slice(0, 10);
            
            if (waitingTurns.length === 0) {
                waitingQueueEl.innerHTML = '<div class="no-turns"><p style="color: #333;">No hay turnos en espera</p></div>';
            } else {
                waitingQueueEl.innerHTML = waitingTurns.map(turn => `
                    <div class="turn-item">
                        <div class="turn-info">
                            <span class="turn-number" style="color: #333;">${turn.number}</span>
                            <span class="turn-time" style="color: #666;">${turn.created_at}</span>
                        </div>
                        <button class="call-turn-btn" onclick="turnify.callSpecificTurn('${turn.number}')">📢 Llamar</button>
                    </div>
                `).join('');
            }
        }

        // Update button states
        if (callBtnEl) {
            callBtnEl.disabled = this.stats.waiting === 0;
        }
        if (finishBtnEl) {
            finishBtnEl.disabled = !this.currentTurn;
        }
    }

    // Update Dashboard
    updateDashboard() {
        const tbody = document.getElementById('turnsList');
        if (!tbody) return;

        // Sort turns: calling first, then waiting, then completed
        const statusOrder = { 'calling': 0, 'waiting': 1, 'completed': 2 };
        const sortedTurns = [...this.turns].sort((a, b) => {
            return (statusOrder[a.status] || 3) - (statusOrder[b.status] || 3);
        });

        tbody.innerHTML = sortedTurns.map(turn => {
            const statusClass = turn.status === 'waiting' ? 'turn-waiting' : 
                              turn.status === 'calling' ? 'turn-calling' : 
                              'turn-completed';
            const statusLabel = turn.status === 'calling' ? 'LLAMANDO' :
                               turn.status === 'waiting' ? 'ESPERANDO' :
                               'COMPLETADO';
            return `
                <tr>
                    <td style=\"font-size: 1.5rem; font-weight: 700; color: var(--dark);\">${turn.number}</td>
                    <td><span class=\"status-badge ${statusClass}\">${statusLabel}</span></td>
                    <td style=\"font-family: monospace;\">${turn.created_at || '-'}</td>
                    <td><strong>${turn.wait_time || '0 min'}</strong></td>
                </tr>`;
        }).join('');

        // Update stats cards
        const totalTurnsEl = document.getElementById('totalTurns');
        const waitingTurnsEl = document.getElementById('waitingTurns');
        const processedTodayEl = document.getElementById('processedToday');
        const liveTurnEl = document.getElementById('liveTurn');
        const nextTurnEl = document.getElementById('nextTurn');

        if (totalTurnsEl) totalTurnsEl.textContent = this.stats.totalToday;
        if (waitingTurnsEl) waitingTurnsEl.textContent = this.stats.waiting;
        if (processedTodayEl) processedTodayEl.textContent = this.stats.processed;
        
        // Update live turn display
        if (liveTurnEl) {
            liveTurnEl.textContent = this.currentTurn?.number || 'SIN TURNO';
        }
        
        // Update next turn
        if (nextTurnEl) {
            const nextTurn = this.turns.find(t => t.status === 'waiting');
            nextTurnEl.textContent = nextTurn?.number || 'NO HAY';
        }
    }

    // Call next turn in queue
    async callNextTurn() {
        try {
            const response = await fetch('/api/call/', { method: 'POST' });
            const data = await response.json();
            
            if (data.turn) {
                await this.fetchTurns();
                this.updateEmployee();
                this.updateDashboard();
            } else {
                alert('No hay turnos en espera');
            }
        } catch (error) {
            console.error('Error calling next turn:', error);
            alert('Error al llamar turno');
        }
    }

    // Call a specific turn
    async callSpecificTurn(number) {
        try {
            const response = await fetch('/api/call-specific/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: number })
            });
            const data = await response.json();
            
            if (data.success) {
                await this.fetchTurns();
                this.updateEmployee();
                this.updateDashboard();
            } else {
                alert(data.message || 'Error al llamar turno');
            }
        } catch (error) {
            console.error('Error calling specific turn:', error);
            alert('Error al llamar turno');
        }
    }

    // Finish current turn
    async finishCurrentTurn() {
        try {
            const response = await fetch('/api/finish/', { method: 'POST' });
            const data = await response.json();
            
            if (data.success) {
                await this.fetchTurns();
                this.updateEmployee();
                this.updateDashboard();
            } else {
                alert(data.message || 'No hay turno activo');
            }
        } catch (error) {
            console.error('Error finishing turn:', error);
            alert('Error al terminar turno');
        }
    }

    // Send WebSocket message
    send(action, data = {}) {
        if (websocketManager && websocketManager.send) {
            websocketManager.send(action, data);
        }
    }

    // Get user position via REST API (fallback when WebSocket fails)
    async getUserPosition(userTurn) {
        try {
            const response = await fetch('/api/position/');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error getting position:', error);
            return null;
        }
    }
}

// Initialize global instance
const turnify = new TurnifyData();

// Status badges CSS
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 0.4rem 1rem;
        border-radius: 25px;
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
    }
    .status-badge.turn-waiting { 
        background: linear-gradient(45deg, #f39c12, #e67e22); 
        color: white; 
    }
    .status-badge.turn-calling { 
        background: linear-gradient(45deg, #e74c3c, #c0392b); 
        color: white; 
        animation: pulse 1.5s infinite;
    }
    .status-badge.turn-completed { 
        background: #27ae60; 
        color: white; 
    }
    .turn-info {
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
`;
document.head.appendChild(style);
