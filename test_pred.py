from tensorflow.keras.models import load_model
from PIL import Image
import numpy as np

# ✅ Load your model
model = load_model("C:/Users/hp/Desktop/ckdp/final_kidney_model.keras")

# ✅ Define class names
class_names = ['Cyst', 'Normal', 'Stone', 'Tumor']

# ✅ Load and preprocess test image
img_path = "C:/Users/hp/Desktop/ckdp/test_image.jpg"  # change path if needed
img = Image.open(img_path).convert("RGB").resize((224, 224))
img_array = np.expand_dims(np.array(img) / 255.0, axis=0)

# ✅ Run prediction
pred = model.predict(img_array)
predicted_class = class_names[np.argmax(pred)]
confidence = float(np.max(pred)) * 100

print(f"\nPrediction: {predicted_class} ({confidence:.2f}% confidence)")
