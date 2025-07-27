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
      <div className="split-layout">
        {/* LEFT PANEL */}
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

        {/* RIGHT PANEL */}
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


