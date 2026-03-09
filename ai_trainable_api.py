from flask import Flask, request, jsonify
import joblib

app = Flask(__name__)
model = joblib.load('ai_model/qa_scikit_model.joblib')

@app.route('/api/ai-trainable', methods=['POST'])
def ai_trainable():
    data = request.get_json()
    question = data.get('question', '')
    answer = model.predict([question])[0]
    return jsonify({'answer': answer})

if __name__ == '__main__':
    app.run(port=5001, debug=True)
