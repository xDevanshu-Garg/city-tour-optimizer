import csv
import math
import json
import time
from typing import List, Tuple, Dict, Optional
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import random

class CityTourOptimizer:
    def __init__(self, csv_file: Optional[str] = None):
        self.cities: List[str] = []
        self.coordinates: Dict[str, Tuple[float, float]] = {}
        self.distance_matrix: List[List[float]] = []
        self.optimized_route: List[int] = []
        self.total_distance: float = 0
        self.optimization_steps: List[Dict] = []
        
        if csv_file:
            self.load_cities_from_csv(csv_file)
    
    def load_cities_from_csv(self, csv_file: str) -> Dict:
        """Load city names from a CSV file"""
        try:
            with open(csv_file, 'r', encoding='utf-8') as file:
                reader = csv.reader(file)
                for row in reader:
                    if row:
                        city = row[0].strip()
                        if city and city not in self.cities:
                            self.cities.append(city)
            return {
                'success': True,
                'message': f'Loaded {len(self.cities)} cities from {csv_file}',
                'count': len(self.cities),
                'cities': self.cities
            }
        except FileNotFoundError:
            return {'success': False, 'message': f'File {csv_file} not found'}
        except Exception as e:
            return {'success': False, 'message': f'Error reading CSV: {str(e)}'}
    
    def load_cities_from_list(self, city_list: List[str]) -> Dict:
        """Load cities from a list"""
        self.cities = [city.strip() for city in city_list if city.strip()]
        return {
            'success': True,
            'message': f'Loaded {len(self.cities)} cities',
            'count': len(self.cities),
            'cities': self.cities
        }
    
    def fetch_coordinates(self, progress_callback=None) -> Dict:
        """Fetch geographical coordinates for each city with progress tracking"""
        geolocator = Nominatim(user_agent="city_tour_optimizer_v2")
        failed_cities = []
        success_count = 0
        
        for idx, city in enumerate(self.cities):
            if progress_callback:
                progress_callback(idx, len(self.cities), city)
            
            tries = 0
            max_tries = 3
            
            while tries < max_tries:
                try:
                    # Add ", India" to ensure we get Indian cities
                    location = geolocator.geocode(f"{city}, India", timeout=10)
                    if location:
                        self.coordinates[city] = (location.latitude, location.longitude)
                        success_count += 1
                        break
                    else:
                        failed_cities.append(city)
                        break
                except (GeocoderTimedOut, GeocoderServiceError):
                    tries += 1
                    if tries == max_tries:
                        failed_cities.append(city)
                    else:
                        time.sleep(1)
                except Exception as e:
                    failed_cities.append(city)
                    break
        
        # Remove cities without coordinates
        self.cities = [city for city in self.cities if city in self.coordinates]
        
        return {
            'success': True,
            'message': f'Fetched coordinates for {success_count} cities',
            'success_count': success_count,
            'failed_cities': failed_cities,
            'coordinates': self.coordinates
        }
    
    def haversine_distance(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate the great circle distance between two points (in km)"""
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        
        dlon = lon2 - lon1
        dlat = lat2 - lat1
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371  # Radius of earth in kilometers
        return c * r
    
    def calculate_distance_matrix(self) -> Dict:
        """Calculate the distance matrix between all cities"""
        n = len(self.cities)
        self.distance_matrix = [[0 for _ in range(n)] for _ in range(n)]
        
        for i in range(n):
            for j in range(n):
                if i != j:
                    city_i = self.cities[i]
                    city_j = self.cities[j]
                    lat1, lon1 = self.coordinates[city_i]
                    lat2, lon2 = self.coordinates[city_j]
                    
                    distance = self.haversine_distance(lat1, lon1, lat2, lon2)
                    self.distance_matrix[i][j] = distance
        
        return {
            'success': True,
            'message': 'Distance matrix calculated',
            'matrix_size': n
        }
    
    def nearest_neighbor_tsp(self, start_city_index: int = 0) -> Dict:
        """Implement the Nearest Neighbor algorithm for TSP"""
        n = len(self.cities)
        if n == 0:
            return {'success': False, 'message': 'No cities available'}
        
        # Initialize
        self.optimization_steps = []
        unvisited = set(range(n))
        current = start_city_index
        self.optimized_route = [current]
        self.total_distance = 0
        unvisited.remove(current)
        
        # Track each step
        while unvisited:
            # Find nearest unvisited city
            nearest = min(unvisited, key=lambda city: self.distance_matrix[current][city])
            distance = self.distance_matrix[current][nearest]
            
            # Record step
            self.optimization_steps.append({
                'from': self.cities[current],
                'to': self.cities[nearest],
                'distance': distance,
                'remaining': len(unvisited)
            })
            
            self.total_distance += distance
            current = nearest
            self.optimized_route.append(current)
            unvisited.remove(nearest)
        
        # Return to start
        return_distance = self.distance_matrix[current][start_city_index]
        self.total_distance += return_distance
        self.optimized_route.append(start_city_index)
        
        self.optimization_steps.append({
            'from': self.cities[current],
            'to': self.cities[start_city_index],
            'distance': return_distance,
            'remaining': 0
        })
        
        return {
            'success': True,
            'message': 'Route optimized',
            'total_distance': round(self.total_distance, 2),
            'cities_count': len(self.cities),
            'route': self.get_route_details()
        }
    
    def get_route_details(self) -> List[Dict]:
        """Get detailed route information"""
        if not self.optimized_route:
            return []
        
        route_details = []
        for i in range(len(self.optimized_route) - 1):
            from_idx = self.optimized_route[i]
            to_idx = self.optimized_route[i + 1]
            from_city = self.cities[from_idx]
            to_city = self.cities[to_idx]
            distance = self.distance_matrix[from_idx][to_idx]
            
            route_details.append({
                'step': i + 1,
                'from': from_city,
                'to': to_city,
                'distance': round(distance, 2),
                'from_coords': self.coordinates[from_city],
                'to_coords': self.coordinates[to_city]
            })
        
        return route_details
    
    def export_to_json(self) -> Dict:
        """Export complete route data as JSON"""
        return {
            'cities': self.cities,
            'coordinates': {city: {'lat': coords[0], 'lng': coords[1]} 
                          for city, coords in self.coordinates.items()},
            'route': self.optimized_route,
            'route_details': self.get_route_details(),
            'total_distance': round(self.total_distance, 2),
            'optimization_steps': self.optimization_steps
        }
    
    def calculate_route_bounds(self) -> Dict:
        """Calculate the bounding box for the route"""
        if not self.coordinates:
            return {}
        
        lats = [coord[0] for coord in self.coordinates.values()]
        lngs = [coord[1] for coord in self.coordinates.values()]
        
        return {
            'min_lat': min(lats),
            'max_lat': max(lats),
            'min_lng': min(lngs),
            'max_lng': max(lngs),
            'center_lat': sum(lats) / len(lats),
            'center_lng': sum(lngs) / len(lngs)
        }

    def genetic_algorithm_tsp(self, population_size: int = 100, 
                             generations: int = 500, 
                             mutation_rate: float = 0.01) -> Dict:
        """Implement Genetic Algorithm for TSP"""
        n = len(self.cities)
        if n == 0:
            return {'success': False, 'message': 'No cities available'}
        
        # Initialize population
        population = [list(range(n)) for _ in range(population_size)]
        for individual in population:
            random.shuffle(individual)
        
        def fitness(route):
            distance = sum(self.distance_matrix[route[i]][route[i+1]] 
                         for i in range(len(route) - 1))
            distance += self.distance_matrix[route[-1]][route[0]]
            return 1 / distance if distance > 0 else 0
        
        def crossover(parent1, parent2):
            start, end = sorted(random.sample(range(n), 2))
            child = [-1] * n
            child[start:end] = parent1[start:end]
            
            pos = end
            for city in parent2:
                if city not in child:
                    if pos >= n:
                        pos = 0
                    child[pos] = city
                    pos += 1
            return child
        
        def mutate(route):
            if random.random() < mutation_rate:
                i, j = random.sample(range(n), 2)
                route[i], route[j] = route[j], route[i]
        
        # Evolution
        best_route = None
        best_fitness = 0
        
        for gen in range(generations):
            # Evaluate fitness
            fitness_scores = [(individual, fitness(individual)) for individual in population]
            fitness_scores.sort(key=lambda x: x[1], reverse=True)
            
            if fitness_scores[0][1] > best_fitness:
                best_fitness = fitness_scores[0][1]
                best_route = fitness_scores[0][0][:]
            
            # Selection and reproduction
            new_population = [fitness_scores[i][0] for i in range(population_size // 10)]
            
            while len(new_population) < population_size:
                parent1 = random.choice(fitness_scores[:population_size // 2])[0]
                parent2 = random.choice(fitness_scores[:population_size // 2])[0]
                child = crossover(parent1, parent2)
                mutate(child)
                new_population.append(child)
            
            population = new_population
        
        # Set the best route
        self.optimized_route = best_route + [best_route[0]]
        self.total_distance = sum(self.distance_matrix[best_route[i]][best_route[i+1]] 
                                 for i in range(len(best_route) - 1))
        self.total_distance += self.distance_matrix[best_route[-1]][best_route[0]]
        
        return {
            'success': True,
            'message': 'Route optimized with Genetic Algorithm',
            'total_distance': round(self.total_distance, 2),
            'cities_count': len(self.cities),
            'route': self.get_route_details()
        }
