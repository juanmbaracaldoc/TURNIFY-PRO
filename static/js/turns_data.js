// Turnify Pro - Datos Real-Time de Turnos (con Django REST APIs)

class TurnifyData {
    constructor() {
        this.turns = [];
        this.currentTurn = null;
        this.stats = { waiting: 0, totalToday: 0, processed: 0 };
        this.init();
    }

    async init() {
        await this.fetchTurns();
        this.updateStats();
        this.updateDashboard();
        setInterval(() => this.fetchTurns(), 3000); // Update cada 3s
    }

    async fetchTurns() {
        try {
            // Obtener todos los turnos via API
            const response = await fetch('/api/all/');
            const data = await response.json();
            this.turns = data.turns || [];
            
            // Turno actual
            const callingTurn = this.turns.find(t => t.status === 'calling');
            this.currentTurn = callingTurn || null;
            
            this.updateStats();
        } catch (error) {
            console.log('Datos demo activados');
            this.useDemoData();
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

    // Update DOM elements
    updateEmployee() {
        document.getElementById('waitingCount').textContent = this.stats.waiting;
        document.getElementById('currentTurn').textContent = this.currentTurn?.number || '--';
        document.getElementById('totalToday').textContent = this.stats.totalToday;
    }

    updateDashboard() {
        const tbody = document.getElementById('turnsList');
        if (!tbody) return;
        
        tbody.innerHTML = this.turns
            .sort((a,b) => a.number.localeCompare(b.number))
            .map(turn => {
                const statusClass = turn.status === 'waiting' ? 'turn-waiting' : 
                                  turn.status === 'calling' ? 'turn-calling' : '';
                return `
                    <tr>
                        <td style="font-size: 1.5rem; font-weight: 700; color: var(--dark);">${turn.number}</td>
                        <td><span class="status-badge ${statusClass}">${turn.status.toUpperCase()}</span></td>
                        <td style="font-family: monospace;">${turn.created_at}</td>
                        <td><strong>${turn.wait_time}</strong></td>
                        <td>
                            ${turn.status === 'waiting' ? 
                                '<button class="btn-small" onclick="turnify.callSpecificTurn(\''+turn.number+'\')">📢 LLAMAR</button>' : 
                                '—'}
                        </td>
                    </tr>`;
            }).join('');

        document.getElementById('totalTurns').textContent = this.stats.totalToday;
        document.getElementById('waitingTurns').textContent = this.stats.waiting;
        document.getElementById('todayProcessed').textContent = this.stats.processed;
        document.getElementById('liveTurn').textContent = this.currentTurn?.number || 'SIN TURNO';
    }

    callSpecificTurn(number) {
        if (confirm(`¿Llamar turno ${number}?`)) {
            fetch('/api/call/', {method: 'POST'})
                .then(() => this.fetchTurns())
                .catch(() => alert('Error al llamar turno'));
        }
    }
}

// Inicializar global
const turnify = new TurnifyData();

// Status badges CSS (inline para demo)
const style = document.createElement('style');
style.textContent = `
.status-badge {
    padding: 0.4rem 1rem;
    border-radius: 25px;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
}
.status-badge.turn-waiting { background: linear-gradient(45deg, #f39c12, #e67e22); color: white; }
.status-badge.turn-calling { 
    background: linear-gradient(45deg, #e74c3c, #c0392b); 
    color: white; 
    animation: pulse 1.5s infinite;
}
.completed { background: #27ae60; color: white; }
.btn-small {
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    background: var(--success);
    color: white;
    border: none;
    border-radius: 20px;
    cursor: pointer;
}
`;
document.head.appendChild(style);

