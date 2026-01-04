from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
import os
import json
import csv
from optimizer_engine import CityTourOptimizer
from werkzeug.utils import secure_filename
import tempfile
import traceback

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = tempfile.gettempdir()
ALLOWED_EXTENSIONS = {'csv', 'txt'}

# Global optimizer instance
optimizer = CityTourOptimizer()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')

@app.route('/api/sample-cities', methods=['GET'])
def get_sample_cities():
    """Get a list of sample Indian cities"""
    try:
        sample_cities = [
            "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai",
            "Kolkata", "Jaipur", "Ahmedabad", "Pune", "Lucknow",
            "Kochi", "Chandigarh", "Goa", "Surat", "Indore"
        ]
        return jsonify({'success': True, 'cities': sample_cities})
    except Exception as e:
        print(f"Error in get_sample_cities: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/load-cities', methods=['POST'])
def load_cities():
    """Load cities from uploaded JSON"""
    try:
        data = request.get_json()
        print(f"Received data: {data}")  # Debug log
        
        if 'cities' in data:
            result = optimizer.load_cities_from_list(data['cities'])
            print(f"Load result: {result}")  # Debug log
            return jsonify(result)
        
        return jsonify({'success': False, 'message': 'No cities provided'})
    
    except Exception as e:
        print(f"Error in load_cities: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/upload-csv', methods=['POST'])
def upload_csv():
    """Upload and process CSV file"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'message': 'No file uploaded'})
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'})
        
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            result = optimizer.load_cities_from_csv(filepath)
            
            # Clean up
            try:
                os.remove(filepath)
            except:
                pass
            
            return jsonify(result)
        
        return jsonify({'success': False, 'message': 'Invalid file type'})
    
    except Exception as e:
        print(f"Error in upload_csv: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/fetch-coordinates', methods=['POST'])
def fetch_coordinates():
    """Fetch coordinates for all loaded cities"""
    try:
        print("Fetching coordinates...")  # Debug log
        if not optimizer.cities:
            return jsonify({'success': False, 'message': 'No cities loaded'})
        
        result = optimizer.fetch_coordinates()
        print(f"Coordinate fetch result: {result}")  # Debug log
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in fetch_coordinates: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/optimize-route', methods=['POST'])
def optimize_route():
    """Optimize the route using TSP algorithm"""
    try:
        data = request.get_json()
        algorithm = data.get('algorithm', 'nearest_neighbor')
        start_city = data.get('start_city', 0)
        
        print(f"Optimizing route with algorithm: {algorithm}, start: {start_city}")  # Debug log
        
        if not optimizer.cities:
            return jsonify({'success': False, 'message': 'No cities loaded'})
        
        if not optimizer.coordinates:
            return jsonify({'success': False, 'message': 'No coordinates available'})
        
        # Calculate distance matrix
        optimizer.calculate_distance_matrix()
        
        # Run optimization
        if algorithm == 'genetic':
            result = optimizer.genetic_algorithm_tsp()
        else:
            result = optimizer.nearest_neighbor_tsp(start_city)
        
        print(f"Optimization result: {result}")  # Debug log
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in optimize_route: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/get-route-data', methods=['GET'])
def get_route_data():
    """Get complete route data for visualization"""
    try:
        if not optimizer.optimized_route:
            return jsonify({'success': False, 'message': 'No optimized route available'})
        
        data = optimizer.export_to_json()
        bounds = optimizer.calculate_route_bounds()
        
        return jsonify({
            'success': True,
            'data': data,
            'bounds': bounds
        })
    
    except Exception as e:
        print(f"Error in get_route_data: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/export-route', methods=['GET'])
def export_route():
    """Export route as JSON file"""
    try:
        if not optimizer.optimized_route:
            return jsonify({'success': False, 'message': 'No route to export'})
        
        data = optimizer.export_to_json()
        
        # Save to temporary file
        temp_file = os.path.join(tempfile.gettempdir(), 'route_export.json')
        with open(temp_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        return send_file(temp_file, as_attachment=True, download_name='optimized_route.json')
    
    except Exception as e:
        print(f"Error in export_route: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.route('/api/status', methods=['GET'])
def get_status():
    """Get current optimizer status"""
    try:
        return jsonify({
            'success': True,
            'cities_loaded': len(optimizer.cities),
            'coordinates_fetched': len(optimizer.coordinates),
            'route_optimized': len(optimizer.optimized_route) > 0,
            'total_distance': round(optimizer.total_distance, 2) if optimizer.total_distance else 0
        })
    except Exception as e:
        print(f"Error in get_status: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)})

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    print(f"Internal error: {e}")
    traceback.print_exc()
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("City Tour Optimizer - Web Application")
    print("=" * 50)
    print("\nServer starting...")
    print("Access the application at: http://localhost:5000")
    print("\nPress Ctrl+C to stop the server\n")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
