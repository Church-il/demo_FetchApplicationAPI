from flask import Flask, request, jsonify, send_from_directory
import requests
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="../frontend/build", static_url_path="")

# Allow only React dev server origin
CORS(app, resources={r"/*": {"origins": "https://localhost:4000"}})

PESAPAL_API_URL = "https://bbi.pesapal.com/api"
CLIENT_ID = os.getenv("PESAPAL_CLIENT_ID")
CLIENT_SECRET = os.getenv("PESAPAL_CLIENT_SECRET")

@app.route("/initiate-payment", methods=["POST"])
def initiate_payment():
    data = request.json
    headers = {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-PP-ClientID": CLIENT_ID,
        "X-PP-ClientSecret": CLIENT_SECRET
    }
    payload = {
        "reference_no": data["reference_no"],
        "amount": data["amount"],
        "payment_method": data["payment_method"],
        "currency": data["currency"]
    }
    try:
        response = requests.post(PESAPAL_API_URL, json=payload, headers=headers)
        print(response.text)  # Debugging
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": str(e)}), 500

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    build_dir = os.path.join(os.path.dirname(__file__), "../frontend/build")
    if path != "" and os.path.exists(f"{build_dir}/{path}"):
        return send_from_directory(build_dir, path)
    else:
        return send_from_directory(build_dir, "index.html")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
