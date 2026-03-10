// Simple Q&A model training in Node.js using TensorFlow.js
// Requirements: yarn add @tensorflow/tfjs @tensorflow/tfjs-node
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

// Load training data from CSV
const csv = fs.readFileSync('train_qa.csv', 'utf8');
const lines = csv.trim().split('\n');
const data = lines.slice(1).map(line => {
  const [q, a] = line.split(',');
  return { question: q.trim().toLowerCase(), answer: a.trim() };
});

// Build vocabulary and label set
const vocab = {};
let vocabIdx = 2; // 0=pad, 1=OOV
const labelSet = [];
data.forEach(({ question, answer }) => {
  question.split(/\W+/).forEach(word => {
    if (word && !vocab[word]) vocab[word] = vocabIdx++;
  });
  if (!labelSet.includes(answer)) labelSet.push(answer);
});

// Encode questions and answers
const maxLen = 12;
function encodeQuestion(q) {
  const words = q.split(/\W+/);
  const seq = words.map(w => vocab[w] || 1);
  while (seq.length < maxLen) seq.push(0);
  return seq.slice(0, maxLen);
}
function encodeLabel(a) {
  return labelSet.indexOf(a);
}

const xs = tf.tensor2d(data.map(d => encodeQuestion(d.question)));
const ys = tf.tensor1d(data.map(d => encodeLabel(d.answer)), 'int32');

// Build model
const model = tf.sequential();
model.add(tf.layers.embedding({ inputDim: vocabIdx, outputDim: 8, inputLength: maxLen }));
model.add(tf.layers.flatten());
model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
model.add(tf.layers.dense({ units: labelSet.length, activation: 'softmax' }));
model.compile({ loss: 'sparseCategoricalCrossentropy', optimizer: 'adam', metrics: ['accuracy'] });

// Train
(async () => {
  await model.fit(xs, ys, { epochs: 200, verbose: 1 });
  await model.save('file://ai_model/qa_model_js');
  fs.writeFileSync('ai_model/vocab.json', JSON.stringify(vocab));
  fs.writeFileSync('ai_model/labels.json', JSON.stringify(labelSet));
  console.log('Training complete. Model, vocab, and labels saved in ai_model/.');
})();
