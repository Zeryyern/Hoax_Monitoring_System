from flask_cors import CORS
from flask import Flask, jsonify, request
from analysis.classifier import classify_article
from datetime import datetime
import traceback

app = Flask(__name__)
CORS(app)

news_storage = []  # In-memory storage for analyzed news


@app.route("/")
def home():
    return jsonify({
        "message": "Hoax Monitoring API is running"
    })


@app.route("/analyze", methods=["POST"])
def analyze_text():
    try:
        data = request.get_json()

        if not data or "text" not in data:
            return jsonify({
                "status": "error",
                "message": "No text provided"
            }), 400

        text = data["text"]

        # 🔥 Use your classifier
        prediction = classify_article(text)

        # 🔥 Convert prediction format (if needed)
        # Make sure it's exactly "Hoax" or "Legitimate"
        if prediction.lower() == "hoax":
            formatted_prediction = "Hoax"
        else:
            formatted_prediction = "Legitimate"

        confidence = 1.0  # replace later if you compute probability

        # 🔥 NEW: Store into memory for monitoring page
        new_item = {
            "id": len(news_storage) + 1,
            "title": text,
            "source": data.get("source", "Unknown Source"),
            "date": datetime.now().strftime("%Y-%m-%d"),
            "category": data.get("category", "General"),
            "prediction": formatted_prediction,
            "confidence": confidence
        }

        news_storage.append(new_item)

        # 🔥 Return normal response (no change for frontend analyze page)
        return jsonify({
            "status": "success",
            "data": new_item
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e),
            "trace": traceback.format_exc()
        }), 500


# 🔥 NEW ROUTE FOR YOUR MONITORING PAGE
@app.route("/get-news", methods=["GET"])
def get_news():
    return jsonify({
        "status": "success",
        "data": news_storage
    })


if __name__ == "__main__":
    app.run(debug=True)
