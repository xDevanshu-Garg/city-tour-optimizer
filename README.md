## Live Link : https://city-tour-optimizer.onrender.com

# City Tour Optimizer (Flask Web App)

A web-based application that solves the **Traveling Salesman Problem (TSP)** to compute an efficient route between multiple cities and visualize it on an interactive map.

This project focuses on **algorithmic problem solving**, **backend–frontend integration**, and **geospatial visualization**.

---

## Tech Stack

- **Backend**: Python, Flask
- **Algorithms**:
  - Nearest Neighbor (Greedy)
  - Genetic Algorithm
- **Frontend**: HTML, CSS, JavaScript
- **Map Visualization**: Leaflet.js
- **Geocoding**: OpenStreetMap (Nominatim via geopy)

---

## Features

- Add cities manually or via CSV file and We also have Sample cities
- Fetch real-world coordinates automatically
- Optimize travel route using different algorithms
- Interactive map with route visualization and city markers
- Export optimized route data as JSON

---

## Algorithms Used

### 1. Nearest Neighbor Algorithm

- Greedy approach that selects the closest unvisited city at each step
- **Time Complexity**: `O(n²)`
- Fast but may not produce the global optimum

### 2. Genetic Algorithm

- Population-based optimization using selection, crossover, and mutation
- Produces better routes for medium-sized inputs
- More accurate than greedy methods but slower

---

## How to Run Locally

pip install -r requirements.txt
python app.py
Open your browser and visit: http://localhost:5000 or just ctrl click the link from terminal.
