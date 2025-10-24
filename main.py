from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from tensorflow.keras.models import load_model
from PIL import Image
import io
import os
import sys
import contextlib

app = FastAPI()

# ✅ Allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# ✅ Disable TensorFlow verbose logging
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf
tf.get_logger().setLevel("ERROR")

# ✅ Class names
class_names = ['Cyst', 'Normal', 'Stone', 'Tumor']

# Global model variable
model = None

# ✅ Silent model loader
def silent_load_model(path):
    with open(os.devnull, 'w') as f, contextlib.redirect_stdout(f), contextlib.redirect_stderr(f):
        return load_model(path)

# ✅ Startup event
@app.on_event("startup")
def startup_event():
    global model
    print("🚀 Loading model silently, please wait...")
    model = silent_load_model("C:/Users/hp/Desktop/ckdp/final_kidney_model.h5")
    print("✅ Model loaded successfully!")

# ✅ Prediction route
@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        return {"error": "Model not loaded yet. Please wait."}

    # Preprocess image
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data)).convert("RGB").resize((224, 224))
    image_array = np.array(image) / 255.0
    image_array = np.expand_dims(image_array, axis=0)

    # Predict
    prediction = model.predict(image_array)
    predicted_class = class_names[np.argmax(prediction)]
    confidence = float(np.max(prediction))

    return {"prediction": predicted_class, "confidence": round(confidence * 100, 2)}

# ✅ Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
