from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from tensorflow.skeras.models import load_model
from PIL import Image
import io

app = FastAPI()


# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # or "http://localhost:5500" if serving JS locally
    allow_methods=["*"],
    allow_headers=["*"]
)

# Load your trained model
model = load_model("C:/Users/hp/Desktop/ckdp/final_kidney_model.keras")
class_names = ['Cyst', 'Normal', 'Stone', 'Tumor']

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data)).resize((224, 224))  # adjust size
    image_array = np.array(image) / 255.0
    image_array = np.expand_dims(image_array, axis=0)

    prediction = model.predict(image_array)
    predicted_class = class_names[np.argmax(prediction)]

    return {"prediction": predicted_class}
