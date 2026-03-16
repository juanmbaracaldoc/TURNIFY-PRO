Turnify Pro – Sistema Inteligente de Gestión de Turnos
Integrantes del proyecto
Maycol Esneider Posada Leon

Juan Manuel Baracaldo

Nicolas Ruiz

Instructor: Crhistian
Ficha: 3203084

Descripción del proyecto
Turnify Pro es un sistema digital de gestión de turnos diseñado para organizar la atención de usuarios en lugares donde normalmente se generan filas largas, como:

bancos

hospitales

oficinas de atención al cliente

entidades públicas

restaurantes

El objetivo del sistema es optimizar el proceso de atención, permitiendo que los usuarios puedan ver el estado de la fila en tiempo real y recibir avisos cuando su turno esté próximo.

Esto ayuda a:

reducir el tiempo de espera

evitar filas físicas

mejorar la organización de la atención

ofrecer una experiencia más cómoda para el usuario

Objetivo del sistema
El objetivo principal del proyecto es desarrollar una plataforma digital que administre turnos de manera automática, permitiendo que tanto usuarios como empleados puedan visualizar y gestionar la fila de atención de forma eficiente.

El sistema permite:

generar turnos automáticamente

mostrar el turno actual en pantalla

notificar cuando el turno de un usuario está próximo

registrar el número de turnos atendidos

Tecnologías utilizadas
Lenguajes de programación
HTML

CSS

JavaScript

Herramientas y servicios
Firebase (base de datos en tiempo real)

Templates del backend

Digital Signage Interface (pantalla de turnos)

Librerías y dependencias
El sistema utiliza principalmente tecnologías web estándar:

HTML5

CSS3

JavaScript (ES6)

Para el manejo de datos en tiempo real se utiliza:

Firebase Firestore / Firebase Realtime Database

Firebase permite que los turnos se actualicen instantáneamente en todas las pantallas conectadas al sistema.

Funcionamiento del sistema
El flujo del sistema funciona de la siguiente manera:

Un usuario solicita un turno.

El sistema genera un número de turno automáticamente.

El turno se guarda en la base de datos.

Una pantalla muestra el turno que está siendo atendido.

Los usuarios pueden ver cuándo su turno está cerca.

Cuando faltan pocos turnos, el sistema genera una alerta.

Explicación del código principal
La pantalla principal muestra el turno actual mediante JavaScript.

Ejemplo del código utilizado:

const turns = ['A001', 'A002', 'A003', 'A004', 'A005'];
let currentIndex = 0;

setInterval(() => {

    let currentTurn = turns[currentIndex];

    document.getElementById('turn').textContent = currentTurn;

    currentIndex = (currentIndex + 1) % turns.length;

}, 4000);
Explicación
Este código:

Crea una lista de turnos.

Utiliza setInterval() para actualizar el turno cada cierto tiempo.

Cambia el contenido del elemento HTML que muestra el turno en pantalla.

Esto simula el sistema de llamados de turno.

Sistema de alerta de turnos
El sistema incluye una función que alerta al usuario cuando faltan solo 2 turnos para ser atendido.

Ejemplo del código:

const userTurn = "A004";

let userIndex = turns.indexOf(userTurn);

if (userIndex - currentIndex === 2) {
    alert("⚠️ Atención: faltan solo 2 turnos para que seas atendido.");
}
Cómo funciona
El sistema compara:

el turno actual

el turno del usuario

Si la diferencia es 2, se muestra una alerta notificando al usuario que su turno está próximo.

Interfaz del sistema
La interfaz del sistema incluye:

pantalla principal de turnos

contador de turnos

reloj en tiempo real

visualización dinámica del turno actual

El diseño utiliza animaciones CSS y gradientes dinámicos para ofrecer una apariencia moderna similar a los sistemas utilizados en aeropuertos o bancos.

Conexión con Firebase
Firebase se utiliza para sincronizar los turnos en tiempo real entre el sistema y las pantallas de visualización.

Ejemplo de conexión:

db.collection("current").doc("active").onSnapshot(doc => {
    document.getElementById('turn').textContent = doc.data()?.number || '--';
});
Explicación
Esta función:

Se conecta a la base de datos de Firebase.

Escucha cambios en el documento donde se guarda el turno actual.

Cuando el turno cambia, la pantalla se actualiza automáticamente.

Esto permite que todas las pantallas conectadas muestren el turno correcto en tiempo real.

Ventajas del sistema
El sistema Turnify Pro ofrece varias ventajas:

mejora la organización de la atención

reduce filas físicas

permite monitorear turnos en tiempo real

mejora la experiencia del usuario

puede adaptarse a diferentes tipos de negocios
