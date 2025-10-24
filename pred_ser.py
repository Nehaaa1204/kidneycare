from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import requests
from io import BytesIO
from PIL import Image
from flask_cors import CORS

app = Flask(__name__)

CORS(app)


# Load your trained model
model = load_model("C:/Users/hp/Desktop/ckdp/final_kidney_model.h5")  # update if needed
classes = ["Normal", "Cyst", "Stone", "Tumor"]



def preprocess_image(img, target_size=(224, 224)):
    img = img.resize(target_size)
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = img_array / 255.0  # normalize
    return img_array

@app.route("/predict", methods=["POST"])
def predict():
    try:
        if "image" in request.files:
            file = request.files["image"]
            img = Image.open(file.stream).convert("RGB")
        elif request.is_json and "imageUrl" in request.json:
            url = request.json["imageUrl"]
            response = requests.get(url)
            img = Image.open(BytesIO(response.content)).convert("RGB")
    
        else:
            return jsonify({"error": "No image provided"}), 400
        print("Request JSON:", request.json)


        img_array = preprocess_image(img)
        prediction = model.predict(img_array)

        pred_index = np.argmax(prediction[0])
        confidence = float(np.max(prediction[0]) * 100)

        return jsonify({
            "prediction": classes[pred_index],
            "confidence": round(confidence, 2)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=8000, debug=True)
