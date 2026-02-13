"""
Product Health & Safety Analyzer - Production Ready
A streamlined tool for analyzing product safety, health impact, and compliance
"""

import streamlit as st
import requests
import json
import os
import time
import re
import hashlib
import plotly.graph_objects as go
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import logging

# Optional imports with fallbacks
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    st.warning("⚠️ Google Generative AI not installed. AI features will be limited.")

try:
    import cv2
    import av
    from pyzbar import pyzbar
    from streamlit_webrtc import webrtc_streamer, VideoProcessorBase, RTCConfiguration
    CAMERA_AVAILABLE = True
except ImportError:
    CAMERA_AVAILABLE = False

# ============================================================================
# CONFIGURATION
# ============================================================================

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API Keys with validation
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
USDA_API_KEY = os.getenv("USDA_API_KEY", "")

# Configure Gemini only if available and key exists
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
    except Exception as e:
        logger.error(f"Failed to configure Gemini: {e}")
        GEMINI_AVAILABLE = False

# Cache directory
CACHE_DIR = os.path.join(os.path.expanduser("~"), ".product_analyzer_cache")
os.makedirs(CACHE_DIR, exist_ok=True)

# Page configuration
st.set_page_config(
    page_title="Product Analyzer",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# ============================================================================
# STYLING
# ============================================================================

def load_css():
    """Load custom CSS styles"""
    st.markdown("""
    <style>
    /* Main title styling */
    .main-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #1a472a;
        margin-bottom: 0.5rem;
        text-align: center;
    }
    
    .subtitle {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 2rem;
        text-align: center;
    }
    
    /* Product header card */
    .product-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 2rem;
        border-radius: 15px;
        color: white;
        margin-bottom: 2rem;
    }
    
    /* Metric boxes */
    .metric-box {
        background: white;
        padding: 1.5rem;
        border-radius: 10px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        text-align: center;
        border-left: 4px solid #667eea;
    }
    
    /* Alert styles */
    .alert-danger {
        background: #fee;
        border-left: 4px solid #e53e3e;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .alert-success {
        background: #efe;
        border-left: 4px solid #38a169;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    .alert-warning {
        background: #fffbeb;
        border-left: 4px solid #f59e0b;
        padding: 1rem;
        border-radius: 8px;
        margin: 1rem 0;
    }
    
    /* Camera box */
    .camera-box {
        background: #f7fafc;
        padding: 2rem;
        border-radius: 15px;
        border: 2px dashed #cbd5e0;
        text-align: center;
    }
    
    /* Nutrient table */
    .nutrient-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 1rem;
    }
    
    .nutrient-table th {
        background: #667eea;
        color: white;
        padding: 12px;
        text-align: left;
        font-weight: 600;
    }
    
    .nutrient-table td {
        padding: 10px;
        border-bottom: 1px solid #e2e8f0;
    }
    
    .nutrient-table tr:hover {
        background: #f7fafc;
    }
    
    /* Ingredients box */
    .ingredients-box {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 4px solid #667eea;
        margin: 1rem 0;
    }
    
    /* Button improvements */
    .stButton>button {
        border-radius: 8px;
        font-weight: 600;
    }
    </style>
    """, unsafe_allow_html=True)

# ============================================================================
# BARCODE PROCESSOR (Camera)
# ============================================================================

if CAMERA_AVAILABLE:
    RTC_CONFIGURATION = RTCConfiguration(
        {"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]}
    )

    class BarcodeProcessor(VideoProcessorBase):
        """Video processor for real-time barcode scanning"""
        
        def __init__(self):
            self.detected_code = None
            self.last_detection_time = 0
            self.detection_cooldown = 2  # seconds
        
        def recv(self, frame):
            """Process video frame and detect barcodes"""
            try:
                img = frame.to_ndarray(format="bgr24")
                
                # Decode barcodes
                barcodes = pyzbar.decode(img)
                
                current_time = time.time()
                
                for barcode in barcodes:
                    try:
                        barcode_data = barcode.data.decode("utf-8")
                        
                        # Only update if cooldown has passed
                        if current_time - self.last_detection_time > self.detection_cooldown:
                            self.detected_code = barcode_data
                            self.last_detection_time = current_time
                        
                        # Draw rectangle around barcode
                        x, y, w, h = barcode.rect
                        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
                        
                        # Add barcode text
                        cv2.putText(
                            img, 
                            barcode_data, 
                            (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 
                            0.5,
                            (0, 255, 0), 
                            2
                        )
                        break  # Process only first barcode
                    
                    except Exception as e:
                        logger.error(f"Error processing barcode: {e}")
                        continue
                
                return av.VideoFrame.from_ndarray(img, format="bgr24")
            
            except Exception as e:
                logger.error(f"Error in video frame processing: {e}")
                return frame

# ============================================================================
# DATABASE - Banned Ingredients & Recalls
# ============================================================================

class Database:
    """Manage banned ingredients and product recalls database"""
    
    def __init__(self):
        self.banned_file = os.path.join(CACHE_DIR, "banned.json")
        self.recalls_file = os.path.join(CACHE_DIR, "recalls.json")
        self._init_data()
    
    def _init_data(self):
        """Initialize database files if they don't exist"""
        # Banned ingredients database
        if not os.path.exists(self.banned_file):
            banned = {
                "Potassium Bromate": ["EU", "UK", "Canada", "Brazil", "Argentina"],
                "BVO": ["EU", "Japan", "India"],
                "Brominated Vegetable Oil": ["EU", "Japan", "India"],
                "Azodicarbonamide": ["EU", "Australia", "Singapore", "UK"],
                "rBGH": ["EU", "Canada", "Australia", "New Zealand", "Japan"],
                "rBST": ["EU", "Canada", "Australia", "New Zealand", "Japan"],
                "BHA": ["Japan", "Some EU countries"],
                "BHT": ["Japan", "Some EU countries"],
                "Tartrazine": ["Norway", "Austria"],
                "Sodium Cyclamate": ["United States"],
                "Titanium Dioxide": ["EU (food use)"],
                "Olestra": ["EU", "Canada"],
                "Ractopamine": ["EU", "China", "Russia"]
            }
            self._save_json(self.banned_file, banned)
        
        # Product recalls database
        if not os.path.exists(self.recalls_file):
            recalls = [
                {
                    "name": "XYZ Peanut Butter",
                    "reason": "Salmonella contamination",
                    "date": "2024-02",
                    "severity": "high"
                },
                {
                    "name": "ABC Infant Formula",
                    "reason": "Cronobacter contamination",
                    "date": "2024-01",
                    "severity": "critical"
                }
            ]
            self._save_json(self.recalls_file, recalls)
    
    def _save_json(self, filepath: str, data: dict) -> bool:
        """Safely save JSON data to file"""
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            return True
        except Exception as e:
            logger.error(f"Error saving JSON to {filepath}: {e}")
            return False
    
    def _load_json(self, filepath: str) -> Optional[dict]:
        """Safely load JSON data from file"""
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading JSON from {filepath}: {e}")
            return None
    
    def check_banned(self, ingredients: str) -> List[Dict[str, any]]:
        """Check if ingredients contain banned substances"""
        if not ingredients:
            return []
        
        banned_data = self._load_json(self.banned_file)
        if not banned_data:
            return []
        
        found = []
        ingredients_lower = ingredients.lower()
        
        for ingredient, regions in banned_data.items():
            # Check for exact and partial matches
            if ingredient.lower() in ingredients_lower:
                found.append({
                    "name": ingredient,
                    "banned_in": regions
                })
        
        return found
    
    def check_recalls(self, product_name: str) -> List[Dict[str, any]]:
        """Check if product has been recalled"""
        if not product_name:
            return []
        
        recalls_data = self._load_json(self.recalls_file)
        if not recalls_data:
            return []
        
        matched_recalls = []
        name_lower = product_name.lower()
        
        for recall in recalls_data:
            recall_name = recall.get("name", "").lower()
            # Check for bidirectional match
            if recall_name in name_lower or name_lower in recall_name:
                matched_recalls.append(recall)
        
        return matched_recalls

# ============================================================================
# API FETCHER - Open Food Facts & USDA
# ============================================================================

class APIFetcher:
    """Fetch product data from external APIs"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'ProductAnalyzer/2.0 (Educational Tool)'
        })
        self.timeout = 10
    
    def _cache_key(self, key: str) -> str:
        """Generate cache filename from key"""
        return hashlib.md5(key.encode()).hexdigest()
    
    def _get_cache(self, key: str, max_age: int = 86400) -> Optional[dict]:
        """Retrieve cached data if still valid"""
        cache_path = os.path.join(CACHE_DIR, f"{self._cache_key(key)}.json")
        
        if not os.path.exists(cache_path):
            return None
        
        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                cached_data = json.load(f)
            
            # Check if cache is still valid
            cache_time = cached_data.get('timestamp', 0)
            if time.time() - cache_time < max_age:
                return cached_data.get('data')
        
        except Exception as e:
            logger.error(f"Error reading cache: {e}")
        
        return None
    
    def _set_cache(self, key: str, data: dict) -> bool:
        """Save data to cache"""
        cache_path = os.path.join(CACHE_DIR, f"{self._cache_key(key)}.json")
        
        try:
            cache_data = {
                'data': data,
                'timestamp': time.time()
            }
            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, indent=2, ensure_ascii=False)
            return True
        
        except Exception as e:
            logger.error(f"Error writing cache: {e}")
            return False
    
    def fetch_openfoodfacts(self, barcode: str) -> Optional[Dict]:
        """Fetch product data from Open Food Facts API"""
        cache_key = f"off_{barcode}"
        
        # Try cache first
        cached = self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for barcode: {barcode}")
            return cached
        
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") == 1:
                product = data.get("product", {})
                
                # Extract and structure product data
                result = {
                    "name": product.get("product_name", "Unknown Product"),
                    "brand": product.get("brands", "Unknown Brand"),
                    "category": product.get("categories", "Unknown Category"),
                    "image": product.get("image_url"),
                    "ingredients": product.get("ingredients_text", "Not available"),
                    "nutrients": product.get("nutriments", {}),
                    "nutri_score": product.get("nutrition_grades", "").upper(),
                    "nova_group": product.get("nova_group"),
                    "allergens": [
                        a.replace("en:", "").replace("-", " ").title() 
                        for a in product.get("allergens_tags", [])
                    ],
                    "additives": [
                        a.replace("en:", "").replace("-", " ").title() 
                        for a in product.get("additives_tags", [])
                    ],
                    "source": "Open Food Facts",
                    "barcode": barcode
                }
                
                # Cache the result
                self._set_cache(cache_key, result)
                return result
            
            else:
                logger.info(f"Product not found in Open Food Facts: {barcode}")
                return None
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching from Open Food Facts: {e}")
            st.error(f"Network error: {str(e)}")
            return None
        
        except Exception as e:
            logger.error(f"Unexpected error in fetch_openfoodfacts: {e}")
            return None
    
    def fetch_usda(self, barcode: str) -> Optional[Dict]:
        """Fetch product data from USDA FoodData Central API"""
        if not USDA_API_KEY:
            logger.warning("USDA API key not configured")
            return None
        
        cache_key = f"usda_{barcode}"
        
        # Try cache first
        cached = self._get_cache(cache_key)
        if cached:
            logger.info(f"Cache hit for USDA barcode: {barcode}")
            return cached
        
        try:
            url = "https://api.nal.usda.gov/fdc/v1/foods/search"
            params = {
                "api_key": USDA_API_KEY,
                "query": barcode,
                "dataType": ["Branded"],
                "pageSize": 1
            }
            
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            foods = data.get("foods", [])
            
            if foods:
                food = foods[0]
                
                # Extract nutrients
                nutrients = {}
                for nutrient in food.get("foodNutrients", []):
                    name = nutrient.get("nutrientName", "").lower()
                    value = nutrient.get("value", 0)
                    
                    # Map to standard keys
                    if "energy" in name and "kcal" in name:
                        nutrients["energy-kcal_100g"] = value
                    elif "protein" in name:
                        nutrients["proteins_100g"] = value
                    elif "carbohydrate" in name:
                        nutrients["carbohydrates_100g"] = value
                    elif "sugars" in name:
                        nutrients["sugars_100g"] = value
                    elif "total lipid" in name or "fat" in name:
                        nutrients["fat_100g"] = value
                    elif "fiber" in name:
                        nutrients["fiber_100g"] = value
                    elif "sodium" in name:
                        nutrients["sodium_100g"] = value / 1000  # Convert mg to g
                
                result = {
                    "name": food.get("description", "Unknown Product"),
                    "brand": food.get("brandOwner", "Unknown Brand"),
                    "category": food.get("foodCategory", "Unknown Category"),
                    "image": None,
                    "ingredients": food.get("ingredients", "Not available"),
                    "nutrients": nutrients,
                    "nutri_score": "",
                    "nova_group": None,
                    "allergens": [],
                    "additives": [],
                    "source": "USDA FoodData Central",
                    "barcode": barcode
                }
                
                # Cache the result
                self._set_cache(cache_key, result)
                return result
            
            else:
                logger.info(f"Product not found in USDA: {barcode}")
                return None
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching from USDA: {e}")
            return None
        
        except Exception as e:
            logger.error(f"Unexpected error in fetch_usda: {e}")
            return None
    
    def search_by_name(self, name: str, limit: int = 5) -> List[Dict]:
        """Search for products by name"""
        try:
            url = "https://world.openfoodfacts.org/cgi/search.pl"
            params = {
                "search_terms": name,
                "json": 1,
                "page_size": limit,
                "fields": "product_name,brands,code,image_url,nutrition_grades"
            }
            
            response = self.session.get(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            
            data = response.json()
            return data.get("products", [])
        
        except Exception as e:
            logger.error(f"Error searching by name: {e}")
            return []

# ============================================================================
# AI ANALYZER
# ============================================================================

class AIAnalyzer:
    """AI-powered product health analysis using Gemini"""
    
    def __init__(self):
        self.model = None
        
        if GEMINI_AVAILABLE and GEMINI_API_KEY:
            try:
                self.model = genai.GenerativeModel("gemini-1.5-flash")
                logger.info("Gemini AI model initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gemini model: {e}")
    
    def analyze_health(
        self, 
        product_name: str, 
        ingredients: str, 
        nutrients: Dict
    ) -> Tuple[float, str]:
        """Analyze health impact of a product"""
        
        if not self.model:
            return 5.0, "⚠️ AI analysis unavailable. Please configure GEMINI_API_KEY."
        
        # Prepare nutrient summary
        nutrient_summary = self._format_nutrients(nutrients)
        
        prompt = f"""Analyze the health impact of the following product:

**Product Name:** {product_name}

**Ingredients:** {ingredients[:500]}  

**Key Nutrients (per 100g):** {nutrient_summary}

Please provide:
1. A health rating from 1-10 (where 10 is healthiest)
2. Top 3 health concerns or benefits
3. Recommended for which groups (e.g., children, adults, athletes, people with specific conditions)
4. Brief reasoning for the rating

Format your response starting with "RATING: X/10" followed by your analysis in bullet points."""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=1000
                )
            )
            
            text = response.text
            
            # Extract rating
            rating = 5.0
            match = re.search(r'RATING:\s*(\d+(?:\.\d+)?)', text, re.IGNORECASE)
            if match:
                rating = float(match.group(1))
                # Clamp rating to 1-10
                rating = max(1.0, min(10.0, rating))
            
            return rating, text
        
        except Exception as e:
            logger.error(f"Error in health analysis: {e}")
            return 5.0, f"⚠️ Analysis error: {str(e)}"
    
    def chat(self, question: str, product_info: Dict) -> str:
        """Chat with AI about the product"""
        
        if not self.model:
            return "⚠️ AI chat unavailable. Please configure GEMINI_API_KEY."
        
        nutrients_summary = self._format_nutrients(product_info.get('nutrients', {}))
        
        prompt = f"""You are a nutrition and food safety expert. Answer the following question about this product:

**Product:** {product_info.get('name', 'Unknown')}
**Brand:** {product_info.get('brand', 'Unknown')}
**Ingredients:** {product_info.get('ingredients', 'Not available')[:300]}
**Key Nutrients:** {nutrients_summary}

**User Question:** {question}

Provide a helpful, accurate, and concise answer (2-3 paragraphs max)."""

        try:
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.7,
                    max_output_tokens=500
                )
            )
            
            return response.text
        
        except Exception as e:
            logger.error(f"Error in AI chat: {e}")
            return f"⚠️ Error: {str(e)}"
    
    def _format_nutrients(self, nutrients: Dict) -> str:
        """Format nutrients dictionary into readable text"""
        if not nutrients:
            return "Not available"
        
        key_nutrients = {
            "energy-kcal_100g": "Calories",
            "proteins_100g": "Protein",
            "carbohydrates_100g": "Carbs",
            "sugars_100g": "Sugars",
            "fat_100g": "Fat",
            "saturated-fat_100g": "Saturated Fat",
            "fiber_100g": "Fiber",
            "sodium_100g": "Sodium",
            "salt_100g": "Salt"
        }
        
        formatted = []
        for key, label in key_nutrients.items():
            if key in nutrients and nutrients[key] is not None:
                value = nutrients[key]
                unit = "kcal" if "kcal" in key else "g"
                formatted.append(f"{label}: {value:.1f}{unit}")
        
        return ", ".join(formatted) if formatted else "Not available"

# ============================================================================
# UI COMPONENTS
# ============================================================================

def render_product_header(product: Dict):
    """Render product header card with image and Nutri-Score"""
    col1, col2 = st.columns([1, 3])
    
    with col1:
        image_url = product.get("image")
        if image_url:
            try:
                st.image(image_url, width=200, use_column_width=False)
            except:
                st.image("https://via.placeholder.com/200x200?text=No+Image", width=200)
        else:
            st.image("https://via.placeholder.com/200x200?text=No+Image", width=200)
    
    with col2:
        st.markdown(f"## {product.get('name', 'Unknown Product')}")
        st.markdown(f"**Brand:** {product.get('brand', 'Unknown')}")
        st.markdown(f"**Category:** {product.get('category', 'Unknown')}")
        
        if product.get('barcode'):
            st.markdown(f"**Barcode:** {product['barcode']}")
        
        if product.get('source'):
            st.caption(f"📊 Data source: {product['source']}")
        
        # Nutri-Score badge
        score = product.get('nutri_score', '')
        if score and score in ['A', 'B', 'C', 'D', 'E']:
            color_map = {
                'A': '#038141',
                'B': '#85bb2f',
                'C': '#fecb02',
                'D': '#ee8100',
                'E': '#e63e11'
            }
            color = color_map.get(score, '#999')
            st.markdown(
                f"<span style='background:{color};color:white;padding:8px 20px;"
                f"border-radius:8px;font-weight:bold;font-size:18px;'>"
                f"Nutri-Score: {score}</span>",
                unsafe_allow_html=True
            )
        else:
            st.markdown(
                "<span style='background:#999;color:white;padding:8px 20px;"
                "border-radius:8px;font-weight:bold;font-size:18px;'>"
                "Nutri-Score: N/A</span>",
                unsafe_allow_html=True
            )

def render_ingredients_section(product: Dict):
    """Render ingredients list in a styled box"""
    st.markdown("### 📋 Ingredients List")
    ingredients = product.get("ingredients", "Not available")
    
    if ingredients and ingredients != "Not available":
        st.markdown(
            f"<div class='ingredients-box'>"
            f"<p style='margin:0;line-height:1.6;'>{ingredients}</p>"
            f"</div>",
            unsafe_allow_html=True
        )
    else:
        st.info("Ingredients information not available for this product")

def render_nutrition_table(nutrients: Dict):
    """Render nutrition facts table"""
    st.markdown("### 📊 Nutrition Facts (per 100g)")
    
    if not nutrients:
        st.info("Nutrition information not available")
        return
    
    # Define nutrient mapping
    nutrient_map = {
        "energy-kcal_100g": ("Energy", "kcal"),
        "energy-kj_100g": ("Energy", "kJ"),
        "proteins_100g": ("Protein", "g"),
        "carbohydrates_100g": ("Carbohydrates", "g"),
        "sugars_100g": ("Sugars", "g"),
        "fat_100g": ("Total Fat", "g"),
        "saturated-fat_100g": ("Saturated Fat", "g"),
        "fiber_100g": ("Dietary Fiber", "g"),
        "sodium_100g": ("Sodium", "g"),
        "salt_100g": ("Salt", "g")
    }
    
    # Build table HTML
    table_html = "<table class='nutrient-table'>"
    table_html += "<tr><th>Nutrient</th><th>Amount</th></tr>"
    
    has_data = False
    for key, (label, unit) in nutrient_map.items():
        if key in nutrients and nutrients[key] is not None:
            value = nutrients[key]
            # Format value
            if isinstance(value, (int, float)):
                formatted_value = f"{value:.2f}"
            else:
                formatted_value = str(value)
            
            table_html += f"<tr><td>{label}</td><td><strong>{formatted_value} {unit}</strong></td></tr>"
            has_data = True
    
    table_html += "</table>"
    
    if has_data:
        st.markdown(table_html, unsafe_allow_html=True)
    else:
        st.info("Detailed nutrition information not available")

def render_safety_alerts(product: Dict, db: Database):
    """Render safety alerts section"""
    ingredients = product.get("ingredients", "")
    product_name = product.get("name", "")
    
    banned = db.check_banned(ingredients)
    recalls = db.check_recalls(product_name)
    
    if banned:
        st.markdown("<div class='alert-danger'>", unsafe_allow_html=True)
        st.markdown("### ⚠️ Banned Ingredients Detected")
        for item in banned:
            regions = ', '.join(item['banned_in'])
            st.markdown(f"**{item['name']}** - Banned in: {regions}")
        st.markdown("</div>", unsafe_allow_html=True)
    
    if recalls:
        st.markdown("<div class='alert-danger'>", unsafe_allow_html=True)
        st.markdown("### 🚨 Product Recall Alert")
        for recall in recalls:
            st.markdown(
                f"**{recall.get('name', 'Unknown')}** - "
                f"Reason: {recall.get('reason', 'Unknown')} "
                f"({recall.get('date', 'Unknown date')})"
            )
        st.markdown("</div>", unsafe_allow_html=True)
    
    if not banned and not recalls:
        st.markdown("<div class='alert-success'>", unsafe_allow_html=True)
        st.markdown("### ✅ No Safety Concerns Found")
        st.markdown("This product appears to comply with major food safety regulations.")
        st.markdown("</div>", unsafe_allow_html=True)

def render_health_analysis(product: Dict, analyzer: AIAnalyzer):
    """Render AI-powered health analysis"""
    with st.spinner("🔬 Analyzing health factors..."):
        rating, analysis = analyzer.analyze_health(
            product.get("name", "Unknown"),
            product.get("ingredients", "Not available"),
            product.get("nutrients", {})
        )
    
    # Rating display
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        if rating >= 7:
            color = "#38a169"  # Green
        elif rating >= 4:
            color = "#f59e0b"  # Orange
        else:
            color = "#e53e3e"  # Red
        
        st.markdown(
            f"<div style='text-align:center;padding:2rem;background:{color}20;"
            f"border-radius:15px;border:3px solid {color};'>"
            f"<h1 style='color:{color};margin:0;'>{rating:.1f}/10</h1>"
            f"<p style='color:#666;margin:0;font-size:18px;font-weight:600;'>Health Rating</p>"
            f"</div>",
            unsafe_allow_html=True
        )
    
    st.markdown("---")
    st.markdown(analysis)

def render_nutrition_chart(nutrients: Dict):
    """Render interactive nutrition radar chart"""
    if not nutrients:
        st.info("Nutrition data not available for chart")
        return
    
    # Define metrics and reference values
    metrics_config = {
        "Calories": ("energy-kcal_100g", 250),
        "Protein": ("proteins_100g", 20),
        "Carbs": ("carbohydrates_100g", 50),
        "Fat": ("fat_100g", 20),
        "Sugar": ("sugars_100g", 10),
        "Fiber": ("fiber_100g", 5)
    }
    
    percentages = []
    labels = []
    
    for label, (key, ref_value) in metrics_config.items():
        value = nutrients.get(key, 0)
        
        if value and value > 0:
            # Calculate percentage (capped at 100)
            percentage = min(100, (value / ref_value) * 100)
            percentages.append(percentage)
            labels.append(label)
    
    # Need at least 3 data points for a radar chart
    if len(percentages) >= 3:
        fig = go.Figure()
        
        fig.add_trace(go.Scatterpolar(
            r=percentages,
            theta=labels,
            fill='toself',
            line_color='#667eea',
            fillcolor='rgba(102, 126, 234, 0.3)',
            name='Nutrition Profile'
        ))
        
        fig.update_layout(
            polar=dict(
                radialaxis=dict(
                    visible=True,
                    range=[0, 100],
                    ticksuffix='%'
                )
            ),
            showlegend=False,
            height=400,
            title={
                'text': "Nutritional Profile (% of Reference Intake)",
                'x': 0.5,
                'xanchor': 'center'
            }
        )
        
        st.plotly_chart(fig, use_container_width=True)
    else:
        st.info("Insufficient nutrition data for chart (need at least 3 metrics)")

def render_camera_scanner():
    """Render camera-based barcode scanner"""
    if not CAMERA_AVAILABLE:
        st.warning(
            "📷 Camera scanning requires additional packages. "
            "Install with: `pip install opencv-python-headless pyzbar streamlit-webrtc`"
        )
        return None
    
    st.markdown("### 📸 Scan Barcode with Camera")
    st.info("Allow camera access and point at a barcode to scan")
    
    ctx = webrtc_streamer(
        key="barcode-scanner",
        video_processor_factory=BarcodeProcessor,
        rtc_configuration=RTC_CONFIGURATION,
        media_stream_constraints={"video": True, "audio": False},
    )
    
    if ctx.video_processor:
        detected_code = ctx.video_processor.detected_code
        
        if detected_code:
            st.success(f"✅ Detected Barcode: **{detected_code}**")
            
            # Store in session state with timestamp to prevent duplicate processing
            current_time = time.time()
            last_scan = st.session_state.get("last_scan_time", 0)
            
            if current_time - last_scan > 3:  # 3 second cooldown
                st.session_state["scanned_code"] = detected_code
                st.session_state["last_scan_time"] = current_time
                return detected_code
    
    return None

def process_barcode(barcode: str, fetcher: APIFetcher) -> bool:
    """Process a barcode and fetch product data"""
    barcode = barcode.strip()
    
    # Validate barcode format
    if not barcode.isdigit() or len(barcode) < 8:
        st.error("❌ Invalid barcode format. Please enter a valid barcode (8-13 digits)")
        return False
    
    with st.spinner(f"🔍 Searching for product: {barcode}..."):
        # Try Open Food Facts first
        product = fetcher.fetch_openfoodfacts(barcode)
        
        # If not found, try USDA
        if not product:
            st.info("🔄 Trying alternate database...")
            product = fetcher.fetch_usda(barcode)
        
        if product:
            st.session_state.product = product
            
            # Add to history (avoid duplicates)
            history = st.session_state.get('history', [])
            # Remove existing entry if present
            history = [p for p in history if p.get('barcode') != barcode]
            # Add to front
            history.insert(0, product)
            # Limit history to 20 items
            st.session_state.history = history[:20]
            
            st.success(f"✅ Product found: **{product.get('name', 'Unknown')}**")
            return True
        else:
            st.error(
                f"❌ Product not found for barcode: **{barcode}**\n\n"
                "This product may not be in the database. Try a different barcode or search by name."
            )
            return False

# ============================================================================
# MAIN APP
# ============================================================================

def main():
    """Main application entry point"""
    
    # Load CSS
    load_css()
    
    # Initialize session state
    if 'product' not in st.session_state:
        st.session_state.product = None
    if 'history' not in st.session_state:
        st.session_state.history = []
    if 'last_scan_time' not in st.session_state:
        st.session_state.last_scan_time = 0
    
    # Initialize components
    db = Database()
    fetcher = APIFetcher()
    analyzer = AIAnalyzer()
    
    # Header
    st.markdown("<h1 class='main-title'>🔍 Product Health & Safety Analyzer</h1>", unsafe_allow_html=True)
    st.markdown(
        "<p class='subtitle'>Scan barcodes or search products to analyze health, safety, and nutritional content</p>",
        unsafe_allow_html=True
    )
    
    # API Status indicators
    with st.expander("ℹ️ System Status"):
        col1, col2, col3 = st.columns(3)
        with col1:
            ai_status = "✅ Active" if (GEMINI_AVAILABLE and GEMINI_API_KEY) else "⚠️ Inactive"
            st.metric("AI Analysis", ai_status)
        with col2:
            usda_status = "✅ Active" if USDA_API_KEY else "⚠️ Inactive"
            st.metric("USDA Database", usda_status)
        with col3:
            camera_status = "✅ Available" if CAMERA_AVAILABLE else "⚠️ Unavailable"
            st.metric("Camera Scan", camera_status)
    
    # Main search interface
    tab_search, tab_camera = st.tabs(["🔍 Search", "📷 Camera Scan"])
    
    with tab_search:
        st.markdown("### Enter Barcode or Product Name")
        
        col1, col2 = st.columns([4, 1])
        with col1:
            search_query = st.text_input(
                "Search",
                placeholder="e.g., 737628064502 or Cheerios",
                key="search_input",
                label_visibility="collapsed"
            )
        with col2:
            search_btn = st.button("🔍 Search", type="primary", use_container_width=True)
        
        st.caption(
            "💡 **Sample barcodes:** "
            "737628064502 (Kettle Chips) | "
            "041196910759 (Cheerios) | "
            "3017620422003 (Nutella)"
        )
        
        # Process search
        if search_btn and search_query:
            query = search_query.strip()
            
            if query.isdigit() and len(query) >= 8:
                # It's a barcode
                if process_barcode(query, fetcher):
                    st.rerun()
            else:
                # It's a product name search
                with st.spinner("🔍 Searching products..."):
                    results = fetcher.search_by_name(query)
                    
                    if results:
                        st.success(f"Found {len(results)} products")
                        
                        for idx, item in enumerate(results):
                            col1, col2, col3 = st.columns([1, 5, 1])
                            
                            with col1:
                                img_url = item.get("image_url")
                                if img_url:
                                    try:
                                        st.image(img_url, width=80)
                                    except:
                                        st.write("🖼️")
                                else:
                                    st.write("🖼️")
                            
                            with col2:
                                product_name = item.get('product_name', 'Unknown Product')
                                brand = item.get('brands', 'Unknown brand')
                                code = item.get('code', 'N/A')
                                
                                st.markdown(f"**{product_name}**")
                                st.caption(f"{brand} • Code: {code}")
                            
                            with col3:
                                if st.button("Select", key=f"select_{idx}"):
                                    if code and code != 'N/A':
                                        if process_barcode(code, fetcher):
                                            st.rerun()
                            
                            if idx < len(results) - 1:
                                st.divider()
                    else:
                        st.error("No products found. Try a different search term.")
    
    with tab_camera:
        if CAMERA_AVAILABLE:
            scanned_code = render_camera_scanner()
            
            # Handle scanned code
            if "scanned_code" in st.session_state:
                code = st.session_state["scanned_code"]
                
                if st.button("📊 Analyze This Product", type="primary"):
                    if process_barcode(code, fetcher):
                        st.balloons()
                        del st.session_state["scanned_code"]
                        st.rerun()
        else:
            st.warning(
                "📷 Camera scanning is not available. "
                "Please install required packages:\n\n"
                "`pip install opencv-python-headless pyzbar streamlit-webrtc`"
            )
    
    st.markdown("---")
    
    # Display Product Analysis
    if st.session_state.product:
        product = st.session_state.product
        
        # Product Header
        render_product_header(product)
        
        st.markdown("---")
        
        # Main content layout
        col1, col2 = st.columns([1, 1])
        
        with col1:
            # Ingredients
            render_ingredients_section(product)
            
            st.markdown("---")
            
            # Nutrition Table
            render_nutrition_table(product.get("nutrients", {}))
        
        with col2:
            # Health Analysis
            st.markdown("### ❤️ AI Health Analysis")
            render_health_analysis(product, analyzer)
        
        st.markdown("---")
        
        # Additional tabs
        detail_tabs = st.tabs([
            "📊 Nutrition Chart",
            "🚫 Safety & Allergens",
            "💬 Ask AI"
        ])
        
        with detail_tabs[0]:
            render_nutrition_chart(product.get("nutrients", {}))
        
        with detail_tabs[1]:
            # Safety alerts
            render_safety_alerts(product, db)
            
            st.markdown("---")
            
            # Allergens
            st.subheader("🥜 Allergen Information")
            allergens = product.get("allergens", [])
            
            if allergens:
                st.markdown("<div class='alert-warning'>", unsafe_allow_html=True)
                st.markdown("**⚠️ May contain allergens:**")
                for allergen in allergens:
                    st.write(f"• {allergen}")
                st.markdown("</div>", unsafe_allow_html=True)
            else:
                st.success("✅ No allergens declared")
            
            # Additives
            st.markdown("---")
            st.subheader("🧪 Food Additives")
            additives = product.get("additives", [])
            
            if additives:
                st.markdown("**Detected additives:**")
                for additive in additives:
                    st.write(f"• {additive}")
            else:
                st.info("No additives detected or information unavailable")
        
        with detail_tabs[2]:
            st.subheader("💬 Ask AI About This Product")
            
            if not (GEMINI_AVAILABLE and GEMINI_API_KEY):
                st.warning("AI chat requires GEMINI_API_KEY to be configured")
            else:
                # Quick questions
                st.markdown("**Quick questions:**")
                quick_questions = [
                    "Is this product healthy for daily consumption?",
                    "Is it safe for children?",
                    "What are potential side effects?",
                    "Can you suggest healthier alternatives?"
                ]
                
                cols = st.columns(2)
                for idx, question in enumerate(quick_questions):
                    with cols[idx % 2]:
                        if st.button(question, key=f"quick_q_{idx}"):
                            with st.spinner("🤔 Thinking..."):
                                answer = analyzer.chat(question, product)
                            st.info(f"**Q:** {question}")
                            st.success(f"**A:** {answer}")
                
                st.markdown("---")
                
                # Custom question
                st.markdown("**Ask your own question:**")
                custom_question = st.text_input(
                    "Your question",
                    placeholder="e.g., Can diabetics consume this product?",
                    key="custom_question"
                )
                
                if st.button("Ask AI", type="primary") and custom_question:
                    with st.spinner("🤔 Thinking..."):
                        answer = analyzer.chat(custom_question, product)
                    st.info(f"**Q:** {custom_question}")
                    st.success(f"**A:** {answer}")
    
    else:
        # Welcome screen
        st.info("👆 Enter a barcode or product name above to get started!")
        
        st.markdown("""
        ### 🎯 What You'll Discover:
        
        - ✅ **Nutri-Score Rating** - Official EU nutrition quality score (A-E)
        - 📋 **Complete Ingredients** - Full list of all ingredients
        - 📊 **Detailed Nutrition** - Per 100g breakdown of nutrients
        - ❤️ **AI Health Analysis** - Smart rating from 1-10 with insights
        - 🚫 **Safety Alerts** - Banned ingredients and recall warnings
        - 🥜 **Allergen Info** - Clear allergen declarations
        - 📈 **Visual Charts** - Interactive nutrition visualization
        - 💬 **AI Chat** - Ask questions about the product
        
        ### 📱 How to Use:
        
        1. **Scan** a barcode with your camera (if available)
        2. **Enter** a barcode manually (8-13 digits)
        3. **Search** by product name
        
        ### 🔬 Data Sources:
        
        - Open Food Facts (worldwide product database)
        - USDA FoodData Central (US products)
        - AI-powered health analysis (Google Gemini)
        """)
    
    # Sidebar - History and Settings
    with st.sidebar:
        st.markdown("### 📜 Scan History")
        
        history = st.session_state.get('history', [])
        
        if history:
            for idx, item in enumerate(history):
                product_name = item.get('name', 'Unknown')
                # Truncate long names
                display_name = product_name[:35] + "..." if len(product_name) > 35 else product_name
                
                if st.button(display_name, key=f"history_{idx}"):
                    st.session_state.product = item
                    st.rerun()
            
            st.markdown("---")
            
            if st.button("🗑️ Clear History"):
                st.session_state.history = []
                st.rerun()
        else:
            st.info("No scan history yet")
        
        st.markdown("---")
        st.markdown("### ⚙️ About")
        st.caption(
            "Product Health & Safety Analyzer v2.0\n\n"
            "Built with Streamlit, powered by AI\n\n"
            "Data from Open Food Facts & USDA"
        )

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Application error: {e}")
        st.error(f"An error occurred: {str(e)}\n\nPlease refresh the page and try again.")