// ===== Application State =====
const state = {
    cities: [],
    coordinates: {},
    route: null,
    algorithm: 'nearest_neighbor',
    startCity: 0,
    map: null,
    markers: [],
    routeLayer: null
};

// ===== DOM Elements =====
const elements = {
    // Input methods
    inputMethods: document.querySelectorAll('.input-method'),
    sampleContent: document.getElementById('sampleContent'),
    manualContent: document.getElementById('manualContent'),
    uploadContent: document.getElementById('uploadContent'),
    
    // City management
    loadSampleBtn: document.getElementById('loadSampleBtn'),
    cityInput: document.getElementById('cityInput'),
    addCityBtn: document.getElementById('addCityBtn'),
    cityList: document.getElementById('cityList'),
    cityCount: document.getElementById('cityCount'),
    clearCitiesBtn: document.getElementById('clearCitiesBtn'),
    
    // Upload
    uploadArea: document.getElementById('uploadArea'),
    csvFileInput: document.getElementById('csvFileInput'),
    
    // Algorithm
    algorithmRadios: document.querySelectorAll('input[name="algorithm"]'),
    startCitySelect: document.getElementById('startCity'),
    
    // Actions
    optimizeBtn: document.getElementById('optimizeBtn'),
    exportBtn: document.getElementById('exportBtn'),
    resetBtn: document.getElementById('resetBtn'),
    
    // Statistics
    statCities: document.getElementById('statCities'),
    statDistance: document.getElementById('statDistance'),
    statTime: document.getElementById('statTime'),
    
    // Map
    map: document.getElementById('map'),
    mapOverlay: document.getElementById('mapOverlay'),
    
    // Route details
    routeSteps: document.getElementById('routeSteps'),
    
    // Modal & Toast
    progressModal: document.getElementById('progressModal'),
    progressTitle: document.getElementById('progressTitle'),
    progressMessage: document.getElementById('progressMessage'),
    progressFill: document.getElementById('progressFill'),
    progressPercent: document.getElementById('progressPercent'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toastMessage'),
    
    // Theme
    themeToggle: document.getElementById('themeToggle')
};

// ===== Utility Functions =====
function showToast(message, duration = 3000) {
    elements.toastMessage.textContent = message;
    elements.toast.classList.add('show');
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, duration);
}

function showProgress(title, message) {
    elements.progressTitle.textContent = title;
    elements.progressMessage.textContent = message;
    elements.progressFill.style.width = '0%';
    elements.progressPercent.textContent = '0%';
    elements.progressModal.classList.add('active');
}

function updateProgress(percent) {
    elements.progressFill.style.width = `${percent}%`;
    elements.progressPercent.textContent = `${percent}%`;
}

function hideProgress() {
    elements.progressModal.classList.remove('active');
}

function updateStats() {
    elements.statCities.textContent = state.cities.length;
    elements.statDistance.textContent = state.route ? `${state.route.total_distance} km` : '-';
}

function updateOptimizeButton() {
    elements.optimizeBtn.disabled = state.cities.length < 2;
}

function updateExportButton() {
    elements.exportBtn.disabled = !state.route;
}

// ===== API Functions =====
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, message: error.message };
    }
}

async function loadSampleCities() {
    showProgress('Loading Cities', 'Fetching sample Indian cities...');
    const result = await apiCall('sample-cities');
    
    if (result.success) {
        state.cities = result.cities;
        await loadCitiesAPI();
        updateProgress(50);
        await fetchCoordinates();
        hideProgress();
        showToast(`Loaded ${result.cities.length} cities successfully!`);
    } else {
        hideProgress();
        showToast('Failed to load sample cities', 3000);
    }
}

async function loadCitiesAPI() {
    const result = await apiCall('load-cities', {
        method: 'POST',
        body: JSON.stringify({ cities: state.cities })
    });
    
    if (result.success) {
        renderCityList();
        updateStartCityOptions();
        updateStats();
        updateOptimizeButton();
    }
    
    return result;
}

async function fetchCoordinates() {
    updateProgress(50);
    elements.progressMessage.textContent = 'Fetching coordinates...';
    
    const result = await apiCall('fetch-coordinates', {
        method: 'POST'
    });
    
    if (result.success) {
        state.coordinates = result.coordinates;
        renderCityList();
        updateProgress(100);
        
        if (result.failed_cities.length > 0) {
            showToast(`Warning: Could not find ${result.failed_cities.length} cities`);
        }
    }
    
    return result;
}

async function optimizeRoute() {
    const startTime = Date.now();
    showProgress('Optimizing Route', 'Calculating optimal path...');
    updateProgress(30);
    
    const result = await apiCall('optimize-route', {
        method: 'POST',
        body: JSON.stringify({
            algorithm: state.algorithm,
            start_city: parseInt(state.startCity)
        })
    });
    
    updateProgress(70);
    
    if (result.success) {
        state.route = result.route;
        
        // Get full route data for visualization
        const routeData = await apiCall('get-route-data');
        updateProgress(90);
        
        if (routeData.success) {
            visualizeRoute(routeData.data, routeData.bounds);
            renderRouteDetails(routeData.data.route_details);
            
            const endTime = Date.now();
            const timeSeconds = ((endTime - startTime) / 1000).toFixed(2);
            elements.statTime.textContent = `${timeSeconds}s`;
            
            updateProgress(100);
            setTimeout(hideProgress, 500);
            showToast('Route optimized successfully!');
        }
    } else {
        hideProgress();
        showToast(`Optimization failed: ${result.message}`);
    }
    
    updateStats();
    updateExportButton();
}

// ===== City Management =====
function addCity(cityName) {
    cityName = cityName.trim();
    if (!cityName) return;
    
    if (state.cities.includes(cityName)) {
        showToast('City already added');
        return;
    }
    
    state.cities.push(cityName);
    elements.cityInput.value = '';
    renderCityList();
    updateStats();
    updateOptimizeButton();
    updateStartCityOptions();
}

function removeCity(index) {
    state.cities.splice(index, 1);
    renderCityList();
    updateStats();
    updateOptimizeButton();
    updateStartCityOptions();
}

function clearCities() {
    if (state.cities.length === 0) return;
    
    if (confirm('Clear all cities?')) {
        state.cities = [];
        state.coordinates = {};
        state.route = null;
        renderCityList();
        clearMap();
        clearRouteDetails();
        updateStats();
        updateOptimizeButton();
        updateExportButton();
        updateStartCityOptions();
        showToast('All cities cleared');
    }
}

function renderCityList() {
    elements.cityList.innerHTML = '';
    elements.cityCount.textContent = state.cities.length;
    
    state.cities.forEach((city, index) => {
        const li = document.createElement('li');
        li.className = 'city-item';
        
        const hasCoords = state.coordinates.hasOwnProperty(city);
        
        li.innerHTML = `
            <div class="city-item-content">
                <span class="city-number">${index + 1}</span>
                <span class="city-name">${city}</span>
            </div>
            <div class="city-actions">
                ${hasCoords ? '<span class="city-status"><i class="fas fa-check-circle" style="color: var(--secondary-color);"></i></span>' : ''}
                <button class="btn-icon" onclick="removeCity(${index})" title="Remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        elements.cityList.appendChild(li);
    });
}

function updateStartCityOptions() {
    elements.startCitySelect.innerHTML = '<option value="0">First city in list</option>';
    
    state.cities.forEach((city, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = city;
        elements.startCitySelect.appendChild(option);
    });
}

// ===== Map Functions =====
function initMap() {
    state.map = L.map('map').setView([20.5937, 78.9629], 5); // Center of India
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(state.map);
}

function clearMap() {
    if (state.markers.length > 0) {
        state.markers.forEach(marker => marker.remove());
        state.markers = [];
    }
    
    if (state.routeLayer) {
        state.routeLayer.remove();
        state.routeLayer = null;
    }
    
    elements.mapOverlay.classList.remove('hidden');
}

function visualizeRoute(data, bounds) {
    clearMap();
    elements.mapOverlay.classList.add('hidden');
    
    // Add markers for each city
    data.route_details.forEach((step, index) => {
        const isStart = index === 0;
        const isEnd = index === data.route_details.length - 1;
        
        // Marker for 'from' city (only for first step)
        if (isStart) {
            const marker = L.marker([step.from_coords[0], step.from_coords[1]], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                        <i class="fas fa-star" style="font-size: 14px;"></i>
                    </div>`,
                    iconSize: [30, 30]
                })
            }).addTo(state.map);
            
            marker.bindPopup(`<strong>${step.from}</strong><br><small>Start</small>`);
            state.markers.push(marker);
        }
        
        // Marker for 'to' city
        if (!isEnd) {
            const marker = L.marker([step.to_coords[0], step.to_coords[1]], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: #6366f1; color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 12px;">
                        ${index + 1}
                    </div>`,
                    iconSize: [28, 28]
                })
            }).addTo(state.map);
            
            marker.bindPopup(`<strong>${step.to}</strong><br><small>Stop ${index + 1}</small>`);
            state.markers.push(marker);
        }
    });
    
    // Draw route with arrows
    const routeCoords = [];
    data.route_details.forEach(step => {
        routeCoords.push([step.from_coords[0], step.from_coords[1]]);
        if (step === data.route_details[data.route_details.length - 1]) {
            routeCoords.push([step.to_coords[0], step.to_coords[1]]);
        }
    });
    
    // Main route line
    state.routeLayer = L.polyline(routeCoords, {
        color: '#ef4444',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1
    }).addTo(state.map);
    
    // Add decorative arrows
    const arrowDecorator = L.polylineDecorator(state.routeLayer, {
        patterns: [
            {
                offset: '10%',
                repeat: '15%',
                symbol: L.Symbol.arrowHead({
                    pixelSize: 12,
                    polygon: false,
                    pathOptions: {
                        stroke: true,
                        color: '#dc2626',
                        weight: 3,
                        opacity: 0.9
                    }
                })
            }
        ]
    }).addTo(state.map);
    
    // Fit bounds
    if (bounds) {
        state.map.fitBounds([
            [bounds.min_lat, bounds.min_lng],
            [bounds.max_lat, bounds.max_lng]
        ], { padding: [50, 50] });
    }
}

// ===== Route Details =====
function renderRouteDetails(routeDetails) {
    elements.routeSteps.innerHTML = '';
    
    routeDetails.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'route-step';
        stepDiv.innerHTML = `
            <div class="route-step-header">
                <span class="step-number">Step ${step.step}</span>
                <span class="step-distance">${step.distance} km</span>
            </div>
            <div class="step-route">
                <strong>${step.from}</strong>
                <span class="step-arrow"><i class="fas fa-arrow-right"></i></span>
                <strong>${step.to}</strong>
            </div>
        `;
        elements.routeSteps.appendChild(stepDiv);
    });
}

function clearRouteDetails() {
    elements.routeSteps.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-route"></i>
            <p>No route calculated yet</p>
        </div>
    `;
}

// ===== File Upload =====
function handleFileUpload(file) {
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    showProgress('Uploading File', 'Processing CSV file...');
    
    fetch('/api/upload-csv', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(async result => {
        if (result.success) {
            state.cities = result.cities;
            updateProgress(50);
            await fetchCoordinates();
            hideProgress();
            showToast(`Loaded ${result.count} cities from file`);
            renderCityList();
            updateStats();
            updateOptimizeButton();
            updateStartCityOptions();
        } else {
            hideProgress();
            showToast(`Upload failed: ${result.message}`);
        }
    })
    .catch(error => {
        hideProgress();
        showToast('Upload error: ' + error.message);
    });
}

// ===== Export =====
async function exportRoute() {
    try {
        const response = await fetch('/api/export-route');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'optimized_route.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Route exported successfully!');
    } catch (error) {
        showToast('Export failed: ' + error.message);
    }
}

// ===== Theme Toggle =====
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    
    const icon = elements.themeToggle.querySelector('i');
    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// ===== Event Listeners =====
function setupEventListeners() {
    // Input method switching
    elements.inputMethods.forEach(method => {
        method.addEventListener('click', () => {
            elements.inputMethods.forEach(m => m.classList.remove('active'));
            method.classList.add('active');
            
            const selectedMethod = method.getAttribute('data-method');
            elements.sampleContent.style.display = selectedMethod === 'sample' ? 'block' : 'none';
            elements.manualContent.style.display = selectedMethod === 'manual' ? 'block' : 'none';
            elements.uploadContent.style.display = selectedMethod === 'upload' ? 'block' : 'none';
        });
    });
    
    // Sample cities
    elements.loadSampleBtn.addEventListener('click', loadSampleCities);
    
    // Manual city entry
    elements.addCityBtn.addEventListener('click', () => addCity(elements.cityInput.value));
    elements.cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addCity(elements.cityInput.value);
    });
    
    // Clear cities
    elements.clearCitiesBtn.addEventListener('click', clearCities);
    
    // File upload
    elements.uploadArea.addEventListener('click', () => elements.csvFileInput.click());
    elements.csvFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });
    
    // Drag and drop
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('drag-over');
    });
    
    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('drag-over');
    });
    
    elements.uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
    });
    
    // Algorithm selection
    elements.algorithmRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.algorithm = e.target.value;
        });
    });
    
    // Start city selection
    elements.startCitySelect.addEventListener('change', (e) => {
        state.startCity = parseInt(e.target.value);
    });
    
    // Actions
    elements.optimizeBtn.addEventListener('click', optimizeRoute);
    elements.exportBtn.addEventListener('click', exportRoute);
    elements.resetBtn.addEventListener('click', () => {
        if (confirm('Reset everything?')) {
            location.reload();
        }
    });
    
    // Theme toggle
    elements.themeToggle.addEventListener('click', toggleTheme);
}

// ===== Initialization =====
function init() {
    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    const icon = elements.themeToggle.querySelector('i');
    icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    
    // Initialize map
    initMap();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initial state
    updateStats();
    updateOptimizeButton();
    updateExportButton();
}

// Make functions globally available
window.removeCity = removeCity;
window.addCity = addCity;

// Start the application
document.addEventListener('DOMContentLoaded', init);
