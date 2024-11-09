var Stadia_AlidadeSmoothDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.{ext}', {
    minZoom: 0,
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ext: 'png'
});

document.getElementById('send-button').addEventListener('click', handleUserInput);
document.getElementById('user-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleUserInput();
});

const apiUrl = "https://script.googleusercontent.com/macros/echo?user_content_key=37GvhBDoQYaPr6Mt_NnJG9F_qIjz5MVl3LqmGhnnA3phOCznEsdG7mCvNCkBXrMhYfj82IiDWYsbyf_ChrGQpbFMdRt-zlNhOJmA1Yb3SEsKFZqtv3DaNYcMrmhZHmUMWojr9NvTBuBLhyHCd5hHayAMJTyAnvb_E1BpNtVbMWcA7iFTle02yiFM4f-ZkkGWgUViyDXKpoNeiBOQ5l8sASm6A2zYK0AXCzwhQ8PNIzBFNgLpWZDgrwtBHn44AOQP6IhVeaOdZAdjRCnt2yBzOA&lib=MkAnzKyjZbLwb3t5BQ5OBOFyzx1Bqeb0r";

// Estados de conversa
let conversationStage = 0;
let map;
let currentMarkers = []; // Armazena os marcadores do mapa para remoção

// Início da conversa
startConversation();

async function fetchStadiums() {
    const response = await fetch(apiUrl);
    return response.json();
}

function startConversation() {
    addMessage("Olá! Eu sou seu assistente para encontrar estádios pelo Brasil! 😊", 'bot');
    setTimeout(() => {
        addMessage("Para começar, por favor me diga uma cidade ou UF onde deseja encontrar um estádio.", 'bot');
        conversationStage = 1;
    }, 1000);
}

async function handleUserInput() {
    const userInput = document.getElementById('user-input').value.trim();
    if (!userInput) return;

    addMessage(userInput, 'user');
    document.getElementById('user-input').value = '';

    if (conversationStage === 1) {
        const stadiums = await fetchStadiums();
        const filteredStadiums = filterStadiums(userInput, stadiums);

        if (filteredStadiums.length > 0) {
            const stadiumNames = filteredStadiums.map(stadium => `➡️ ${stadium.estadio}`).join('\n');

            // Utilizando \n para quebras de linha no texto
            const formattedMessage = `Encontrei os seguintes estádios em "${userInput}":\n\n${stadiumNames}\n\nObserve no mapa suas localizações! 📍🗺️`;

            addMessage(formattedMessage, 'bot');
            displayMap(filteredStadiums);  // Exibe o mapa com os estádios encontrados
        } else {
            addMessage("Desculpe, não encontrei estádios para essa cidade ou UF. Tente novamente!", 'bot');
        }
        conversationStage = 2;
        setTimeout(() => {
            addMessage("Posso te ajudar com mais alguma cidade ou UF? Digite 'sim' para continuar ou 'não' para encerrar.", 'bot');
        }, 1000);
    } else if (conversationStage === 2) {
        if (userInput.toLowerCase() === 'sim') {
            addMessage("Ótimo! Por favor, me informe outra cidade ou UF.", 'bot');
            conversationStage = 1;
        } else {
            addMessage("Obrigada por usar o assistente de estádios! Até mais! 👋", 'bot');
            conversationStage = 0;
            setTimeout(startConversation, 3000);
        }
    }
}

function addMessage(content, sender) {
    const chatBox = document.getElementById('chat-box');
    const message = document.createElement('div');
    message.classList.add('message', sender);

    // Utilizando textContent para exibir o texto com \n (quebras de linha)
    message.textContent = content;

    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function normalizeText(text) {
    return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();
}

function filterStadiums(userInput, stadiums) {
    const normalizedInput = normalizeText(userInput);
    return stadiums.filter(stadium =>
        normalizeText(stadium.cidade) === normalizedInput ||
        normalizeText(stadium.uf) === normalizedInput
    );
}

function addMessage(content, sender) {
    const chatBox = document.getElementById('chat-box');
    const message = document.createElement('div');
    message.classList.add('message', sender);
    message.textContent = content;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Inicializa o mapa do Leaflet
function initializeMap() {
    map = L.map('map').setView([-15.7942, -47.8822], 4); // Centraliza no Brasil
    Stadia_AlidadeSmoothDark.addTo(map);  // Usando o basemap dark
}

// Função para calcular o tamanho do círculo baseado na capacidade
function getCircleRadius(capacity, minCapacity, maxCapacity) {
    const minRadius = 5;  // Raio mínimo
    const maxRadius = 30; // Raio máximo
    return (capacity - minCapacity) / (maxCapacity - minCapacity) * (maxRadius - minRadius) + minRadius;
}

// Função para escolher a cor do círculo com base na capacidade
function getCircleColor(capacity, minCapacity, maxCapacity) {
    const minColor = [0, 255, 0]; // Verde
    const maxColor = [255, 0, 0]; // Vermelho

    const ratio = (capacity - minCapacity) / (maxCapacity - minCapacity);
    const color = [
        minColor[0] + ratio * (maxColor[0] - minColor[0]),
        minColor[1] + ratio * (maxColor[1] - minColor[1]),
        minColor[2] + ratio * (maxColor[2] - minColor[2])
    ];

    return `rgb(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])})`;
}

// Exibe o mapa com os estádios filtrados
function displayMap(stadiums) {
    if (!map) initializeMap();

    // Remove todas as camadas de marcador (stadiums) anteriores antes de adicionar novas
    currentMarkers.forEach(marker => map.removeLayer(marker));
    currentMarkers = []; // Limpa os marcadores armazenados

    // Encontra a capacidade máxima e mínima
    const capacities = stadiums.map(stadium => stadium.capacidade);
    const maxCapacity = Math.max(...capacities);
    const minCapacity = Math.min(...capacities);

    stadiums.forEach(stadium => {
        const radius = getCircleRadius(stadium.capacidade, minCapacity, maxCapacity);
        const color = getCircleColor(stadium.capacidade, minCapacity, maxCapacity);

        const circle = L.circleMarker([stadium.latitude, stadium.longitude], {
            radius: radius,
            fillColor: color,
            color: color,
            weight: 2,
            opacity: 1,
            fillOpacity: 0.7
        }).addTo(map);

        circle.bindPopup(`<b>${stadium.estadio}</b><br>${stadium.cidade}, ${stadium.uf}<br>Capacidade: ${stadium.capacidade}`);
        currentMarkers.push(circle); // Armazena o marcador para remoção futura
    });

    // Ajusta o zoom e centraliza no conjunto de estádios encontrados
    if (stadiums.length === 1) {
        map.setView([stadiums[0].latitude, stadiums[0].longitude], 12);
    } else {
        const bounds = stadiums.map(s => [s.latitude, s.longitude]);
        map.fitBounds(bounds, { padding: [50, 50] });
    }
}

initializeMap(); // Inicializa o mapa com o basemap visível
