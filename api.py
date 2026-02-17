from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify({
        "message": "Hoax Monitoring API is running"
    })

if __name__ == "__main__":
    app.run(debug=True)
