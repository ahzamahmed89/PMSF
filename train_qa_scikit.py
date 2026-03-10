import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import make_pipeline
import joblib

# Load training data
qa = pd.read_csv('train_qa.csv')
questions = qa['question'].astype(str)
answers = qa['answer'].astype(str)


# Split data for evaluation
from sklearn.model_selection import train_test_split
X_train, X_test, y_train, y_test = train_test_split(questions, answers, test_size=0.3, random_state=42)

# Build pipeline: TF-IDF + Naive Bayes
model = make_pipeline(TfidfVectorizer(), MultinomialNB())
model.fit(X_train, y_train)

# Evaluate accuracy
accuracy = model.score(X_test, y_test)
print(f'Model accuracy on test set: {accuracy:.2f}')

# Save model
joblib.dump(model, 'ai_model/qa_scikit_model.joblib')
print('Model trained and saved as ai_model/qa_scikit_model.joblib')

# Show predictions for test questions
for q, true_a in zip(X_test[:5], y_test[:5]):
	pred_a = model.predict([q])[0]
	print(f'Q: {q}\nTrue: {true_a}\nPredicted: {pred_a}\n')
