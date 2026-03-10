import pandas as pd
import tensorflow as tf
from sklearn.model_selection import train_test_split
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
import json

# Load data
df = pd.read_csv('train_qa.csv')
questions = df['question'].astype(str).tolist()
answers = df['answer'].astype(str).tolist()

# Tokenize questions
max_words = 1000
max_len = 20
tokenizer = Tokenizer(num_words=max_words, oov_token='<OOV>')
tokenizer.fit_on_texts(questions)
sequences = tokenizer.texts_to_sequences(questions)
padded = pad_sequences(sequences, maxlen=max_len, padding='post')

# Encode answers as categorical labels
answer_tokenizer = Tokenizer()
answer_tokenizer.fit_on_texts(answers)
answer_seqs = answer_tokenizer.texts_to_sequences(answers)
answer_classes = [seq[0] if seq else 0 for seq in answer_seqs]
num_classes = len(set(answer_classes)) + 1

X_train, X_test, y_train, y_test = train_test_split(padded, answer_classes, test_size=0.2, random_state=42)

# Build model
model = tf.keras.Sequential([
    tf.keras.layers.Embedding(max_words, 16, input_length=max_len),
    tf.keras.layers.GlobalAveragePooling1D(),
    tf.keras.layers.Dense(16, activation='relu'),
    tf.keras.layers.Dense(num_classes, activation='softmax')
])

model.compile(loss='sparse_categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

# Train
model.fit(X_train, y_train, epochs=100, validation_data=(X_test, y_test), verbose=2)

# Save model and tokenizers
import os
os.makedirs('ai_model/qa_model', exist_ok=True)
model.save('ai_model/qa_model')

# Save tokenizers as JSON
with open('ai_model/question_tokenizer.json', 'w') as f:
    f.write(json.dumps(tokenizer.to_json()))
with open('ai_model/answer_tokenizer.json', 'w') as f:
    f.write(json.dumps(answer_tokenizer.to_json()))

print('Training complete. Model and tokenizers saved in ai_model/.')
