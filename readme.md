# Pesapal Browser Based POS Integration: Flask + React

This project demonstrates how to integrate **Pesapal's Browser-Based Payment API** into a full-stack application using:

- **Frontend:** React (Create React App)
- **Backend:** Python Flask
- **Payment Provider:** Pesapal (Demo API)
- **State Management:** Local component state (React Hooks)
- **Security:** Environment variables for API keys
- **Features:**
  - Product listing with prices
  - Payment method selection (M-Pesa / Card)
  - Fetches a live `launchUrl` from Pesapal
  - Embeds Pesapal iframe dynamically
  - Responsive UI (desktop & mobile)

---

## 1. Project Structure

```
pesapal_demo/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   └── certs/ (for HTTPS testing)
│
├── frontend/
│   ├── package.json
│   ├── public/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│
└── README.md
```

---

## 2. Prerequisites

- **Python:** v3.10+ (tested with 3.13.5)
- **Node.js:** v18+
- **npm:** v9+
- **OpenSSL:** to generate self-signed SSL certificates for local HTTPS
- **Pesapal Demo Account:**  
  Obtain your `PESAPAL_CLIENT_ID` and `PESAPAL_CLIENT_SECRET`.

---

## 3. Backend Setup (Flask)

### 3.1 Navigate to backend folder:
```bash
cd backend
```

### 3.2 Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate   # macOS/Linux
venv\Scripts\activate      # Windows
```

### 3.3 Install dependencies:
```bash
pip install -r requirements.txt
```

### 3.4 Create .env file:
```env
PESAPAL_CLIENT_ID=your_client_id_here
PESAPAL_CLIENT_SECRET=your_client_secret_here
```

### 3.5 Generate self-signed SSL certificates (for local HTTPS):
```bash
mkdir certs
openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes
```
*Fill in the prompts or press Enter to skip*

### 3.6 Run Flask app:
```bash
python app.py
```

Flask should now run at: **https://localhost:5000**

---

## 4. Frontend Setup (React)

### 4.1 Navigate to frontend folder:
```bash
cd frontend
```

### 4.2 Install dependencies:
```bash
npm install
```

### 4.3 Update package.json proxy:
Add this line to your `package.json`:
```json
"proxy": "https://localhost:5000"
```

### 4.4 Enable HTTPS for React Dev Server:
```bash
# macOS/Linux
NODE_TLS_REJECT_UNAUTHORIZED=0 HTTPS=true npm start

# Windows PowerShell
set NODE_TLS_REJECT_UNAUTHORIZED=0 && HTTPS=true npm start

# Windows Command Prompt
set NODE_TLS_REJECT_UNAUTHORIZED=0
set HTTPS=true
npm start
```

React app will run at: **https://localhost:3000**

---

## 5. How to Use

1. Visit **https://localhost:3000**
2. Choose payment method (M-Pesa or Card)
3. Select a product and click **Pay Now**
4. The app fetches a fresh `launchUrl` from Flask
5. Pesapal iframe loads in the right panel
6. Complete payment
7. On success or cancel, an alert appears

---

## 6. Key Files

### 6.1 Backend (app.py)
```python
from flask import Flask, request, jsonify, send_from_directory
import requests
from flask_cors import CORS
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="../frontend/build", static_url_path="")
CORS(app, resources={r"/*": {"origins": "https://localhost:3000"}})

PESAPAL_API_URL = "https://bbidemo.pesapal.com/api"
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
    app.run(host="0.0.0.0", port=5000, debug=True, ssl_context=("certs/cert.pem", "certs/key.pem"))
```

### 6.2 Requirements (requirements.txt)
```txt
flask
flask-cors
requests
python-dotenv
```

### 6.3 Frontend (App.js)
```javascript
import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [iframeUrl, setIframeUrl] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("mpesa");

  const products = [
    { id: 1, name: "Product A", price: 1 },
    { id: 2, name: "Product B", price: 2 },
    { id: 3, name: "Product C", price: 3 }
  ];

  const initiatePayment = async (product) => {
    try {
      const res = await fetch("/initiate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference_no: `order-${product.id}-${Date.now()}`,
          amount: product.price,
          payment_method: paymentMethod,
          currency: "KES"
        })
      });

      const data = await res.json();
      console.log("Response:", data);

      if (data.payload && data.payload.launchUrl) {
        setIframeUrl(data.payload.launchUrl);
      } else {
        alert("Payment initialization failed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    window.addEventListener("message", (event) => {
      if (event.data.action === "success") {
        alert("Payment Successful: " + JSON.stringify(event.data));
        setIframeUrl(null);
      } else if (event.data.action === "cancel") {
        alert("Payment Cancelled");
        setIframeUrl(null);
      }
    });
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>demo_FetchAPIApplication</h1>
      </header>

      <div className="split-layout">
        <div className="left-panel">
          <div className="payment-methods">
            <h3>Select Payment Method</h3>
            <label className={`radio-option ${paymentMethod === "mpesa" ? "active" : ""}`}>
              <input
                type="radio"
                value="mpesa"
                checked={paymentMethod === "mpesa"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="custom-radio"></span>M-Pesa
            </label>
            <label className={`radio-option ${paymentMethod === "card" ? "active" : ""}`}>
              <input
                type="radio"
                value="card"
                checked={paymentMethod === "card"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <span className="custom-radio"></span>Card
            </label>
          </div>

          <div className="products">
            {products.map((p) => (
              <div key={p.id} className="product">
                <span>{p.name} - KES {p.price}</span>
                <button onClick={() => initiatePayment(p)}>Pay Now</button>
              </div>
            ))}
          </div>
        </div>

        <div className="right-panel">
          {iframeUrl && (
            <iframe
              src={iframeUrl}
              title="Pesapal Payment"
              className="payment-iframe"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
```

---

## 7. Debugging

### ✅ Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| CORS errors | Wrong CORS() config in Flask | Use `CORS(app, resources={r"/*": {"origins": "https://localhost:3000"}})` |
| Proxy error ECONNRESET | React proxy pointing to HTTP instead of HTTPS | Update `"proxy": "https://localhost:5000"` |
| Iframe blocked | Mixed content (http → https) | Use HTTPS for both React & Flask |
| No iframe appears | Wrong JSON key (launchUrl vs launch_url) | Use the correct key in React |
| Module not found 'dotenv' | python-dotenv not installed | `pip install python-dotenv` |
| SSL certificate error | Missing certificates | Generate certificates with OpenSSL |

### ✅ Testing Steps

1. **Check Flask is running:**
   - Visit https://localhost:5000 (should show React app or 404)
   
2. **Check React proxy:**
   - Open DevTools → Network → Click "Pay Now"
   - Should see POST to `/initiate-payment` with 200 OK
   
3. **Check iframe loading:**
   - Console should log: "Response: {payload: {launchUrl: '...'}}"
   - Right panel should show Pesapal iframe

---

## 8. Building for Production

### 8.1 Build React:
```bash
cd frontend
npm run build
```

### 8.2 Deploy to Production:
Flask `app.py` already serves React build files:
```python
app = Flask(__name__, static_folder="../frontend/build", static_url_path="")
```

### 8.3 Environment Variables for Production:
Add these to your hosting platform:
- `PESAPAL_CLIENT_ID`
- `PESAPAL_CLIENT_SECRET`

### 8.4 Use Production WSGI Server:
```bash
pip install gunicorn
gunicorn app:app
```

---

## 9. Responsive Design

- **Desktop:** Split-screen (products left, iframe right)
- **Mobile:** Stacked (iframe below products)
- **CSS Media Query:** `@media (max-width: 768px)`

---

## 10. Security Notes

- ✅ API keys stored in environment variables
- ✅ CORS configured for specific origins
- ✅ HTTPS enforced for local development
- ✅ No sensitive data in client-side code
- ⚠️ Self-signed certificates only for development

---

## 11. Next Steps

- ✅ Add Pesapal callback URL for server-side payment verification
- ✅ Use Redis/Database for session management
- ✅ Add payment status tracking
- ✅ Deploy to production with real SSL certificates
- ✅ Add unit tests for API endpoints
- ✅ Implement error logging and monitoring

---

## 12. License

MIT License – Use freely for demos and integrations.

---

## 13. Support

If you encounter issues:

1. Check the **Debugging** section above
2. Verify all prerequisites are installed
3. Ensure environment variables are set correctly
4. Test with the provided demo API keys first
5. Check browser console and Flask terminal for errors


**Happy coding! 🚀**