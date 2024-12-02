const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const dbPassword = process.env.DB_PASSWORD;

// MongoDB connection
const mongoURI = 'mongodb+srv://vijay:${dbPassword}@wordlycluster.gy6mr.mongodb.net/?retryWrites=true&w=majority&appName=wordlyCluster';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Define the schema and model for words
const wordSchema = new mongoose.Schema({
    date: { type: String, required: true },
    words: { type: Object, required: true }
});

const Word = mongoose.model('Word', wordSchema);

// Define the schema and model for sentences
const sentenceSchema = new mongoose.Schema({
    sentence: { type: String, required: true }
});

const Sentence = mongoose.model('Sentence', sentenceSchema);

// Define the schema and model for phrasal verbs
const phrasalVerbSchema = new mongoose.Schema({
    genere: { type: String, default: null },
    phrase: { type: String, required: true },
    ans: { type: String, required: true }

});

const PhrasalVerb = mongoose.model('PhrasalVerb', phrasalVerbSchema);

//preposition schema
const prepositionSchema = new mongoose.Schema({
    genre: { type: String, default: null },
    preposition: { type: String, required: true },
    example_sentence: { type: String, required: true },
    descrp: { type: String, default: null }
});
const Preposition = mongoose.model('Preposition', prepositionSchema);


// Middleware
app.use(bodyParser.json());

// Route to get all words by date
app.get('/words', async (req, res) => {
    try {
        const words = await Word.find();
        res.json(words);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get all words from all dates
app.get('/words/all', async (req, res) => {
    try {
        const words = await Word.find();
        let allWords = [];

        words.forEach(dateEntry => {
            for (const [key, definitions] of Object.entries(dateEntry.words)) {
                allWords.push({ [key]: definitions });
            }
        });

        res.json(allWords);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to add new words and append if date exists
app.post('/words', async (req, res) => {
    const { date, words } = req.body;
    if (!date || !words) {
        return res.status(400).json({ message: 'Date and words are required' });
    }

    try {
        const existingEntry = await Word.findOne({ date });

        if (existingEntry) {
            let updatedWords = existingEntry.words;
            let alreadyPresentWords = [];
            let newWordsAdded = [];

            for (const [key, definitions] of Object.entries(words)) {
                if (updatedWords.hasOwnProperty(key)) {
                    alreadyPresentWords.push(key);
                } else {
                    updatedWords[key] = definitions;
                    newWordsAdded.push(key);
                }
            }

            const result = await Word.updateOne(
                { date },
                { $set: { words: updatedWords } }
            );

            let message = 'Words updated successfully.';
            if (alreadyPresentWords.length > 0) {
                message += ` The following words were already present and not added: ${alreadyPresentWords.join(', ')}`;
            }
            if (newWordsAdded.length > 0) {
                message += ` The following new words were added: ${newWordsAdded.join(', ')}`;
            }
            return res.status(200).json({ message, entry: updatedWords });

        } else {
            const newWord = new Word({ date, words });
            await newWord.save();
            res.status(201).json({ message: 'Words added successfully', entry: newWord });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get specific word details
app.get('/words/:word', async (req, res) => {
    const specificWord = req.params.word.toLowerCase();
    try {
        const words = await Word.find();
        let foundWord = null;

        words.forEach(dateEntry => {
            for (const [key, definitions] of Object.entries(dateEntry.words)) {
                if (key.toLowerCase() === specificWord || definitions.some(def => def.toLowerCase() === specificWord)) {
                    foundWord = { [key]: definitions };
                    break;
                }
            }
            if (foundWord) {
                return;
            }
        });

        if (foundWord) {
            res.json(foundWord);
        } else {
            res.status(404).json({ message: 'Word not found' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get words for a specific date provided in the request body
app.post('/words/date', async (req, res) => {
    const { date } = req.body; // Expected format: DD/MM/YYYY
    if (!date) {
        return res.status(400).json({ message: 'Date is required' });
    }
    try {
        const words = await Word.findOne({ date });
        if (words) {
            res.json(words);
        } else {
            res.status(404).json({ message: 'No words found for this date' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get all words from the given dates in the body
app.post('/words/all', async (req, res) => {
    const { dates } = req.body; // Expected format: [ "DD/MM/YYYY", "DD/MM/YYYY", ... ]
    
    if (!dates || !Array.isArray(dates)) {
        return res.status(400).json({ message: 'Array of dates is required' });
    }

    try {
        const wordsResults = await Word.find({ date: { $in: dates } });
        let allWords = [];

        wordsResults.forEach(dateEntry => {
            for (const [key, definitions] of Object.entries(dateEntry.words)) {
                allWords.push({ [key]: definitions });
            }
        });

        res.json(allWords);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to add a sentence
app.post('/sentence', async (req, res) => {
    const { sentence } = req.body;
    if (!sentence) {
        return res.status(400).json({ message: 'Sentence is required' });
    }

    try {
        const newSentence = new Sentence({ sentence });
        await newSentence.save();
        res.status(201).json({ message: 'Sentence added successfully', entry: newSentence });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get all sentences
app.get('/sentence/all', async (req, res) => {
    try {
        const sentences = await Sentence.find();
        res.json(sentences);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get sentences containing a specific word
app.get('/sentence/:word', async (req, res) => {
    const word = req.params.word.toLowerCase();
    try {
        const sentences = await Sentence.find();
        const matchingSentences = sentences.filter(sentence => 
            sentence.sentence.toLowerCase().includes(word)
        );

        if (matchingSentences.length > 0) {
            res.json(matchingSentences);
        } else {
            res.status(404).json({ message: 'No sentences found containing the word' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


//apis for the phrasal verbs:


// Route to get all phrasal verbs
app.get('/phrasalverbs/all', async (req, res) => {
    try {
        const phrasalVerbs = await PhrasalVerb.find();
        res.json(phrasalVerbs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to add a phrasal verb
app.post('/phrasalverbs', async (req, res) => {
    const { genere, phrase, ans } = req.body;
    if (!phrase || !ans) {
        return res.status(400).json({ message: 'Phrase and answer are required' });
    }

    try {
        const newPhrasalVerb = new PhrasalVerb({ genere, phrase, ans });
        await newPhrasalVerb.save();
        res.status(201).json({ message: 'Phrasal verb added successfully', entry: newPhrasalVerb });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get phrasal verbs by genere
app.get('/phrasalverbs/:genere', async (req, res) => {
    const { genere } = req.params;
    try {
        const phrasalVerbs = await PhrasalVerb.find({ genere });
        if (phrasalVerbs.length > 0) {
            // Extract only the phrase and answer fields
            const response = phrasalVerbs.map(verb => ({
                phrase: verb.phrase,
                ans: verb.ans
            }));
            res.json(response);
        } else {
            res.status(404).json({ message: `No phrasal verbs found for genere: ${genere}` });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Route to get all words from a specific month
app.get('/words/month/:month', async (req, res) => {
    const month = parseInt(req.params.month); // Month should be in integer format (e.g., 7 for July)
    if (!month || month < 1 || month > 12) {
        return res.status(400).json({ message: 'Invalid month. Please provide a month between 1 and 12.' });
    }

    try {
        // Fetch all words entries
        const wordsEntries = await Word.find();
        
        // Filter words by month
        const wordsInMonth = wordsEntries.filter(entry => {
            const entryMonth = parseInt(entry.date.split('/')[1]); // Extract month from date string (format DD/MM/YYYY)
            return entryMonth === month;
        });

        // Combine all words in a single array
        let allWordsInMonth = [];
        wordsInMonth.forEach(entry => {
            for (const [key, definitions] of Object.entries(entry.words)) {
                allWordsInMonth.push({ [key]: definitions });
            }
        });

        // Check if any words were found for the month
        if (allWordsInMonth.length > 0) {
            res.json(allWordsInMonth);
        } else {
            res.status(404).json({ message:` No words found for month: ${month} `});
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//preposition API:
//to get all the prepositions:
app.get('/preposition/all', async (req, res) => {
    try {
        const prepositions = await Preposition.find().select('-id -_v');
        res.json(prepositions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

//to get all the prepositions related to specific genre:
app.get('/preposition/:genre', async (req, res) => {
    const { genre } = req.params;

    try {
        const prepositions = await Preposition.find({ genre }).select('-id -_v');
        res.json(prepositions);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

  // POST a new preposition
app.post('/preposition', async (req, res) => {
    const { genre, preposition, example_sentence, descrp } = req.body;
  
    const newPreposition = new Preposition({
      genre,
      preposition,
      example_sentence,
      descrp
    });
  
    try {
      const savedPreposition = await newPreposition.save();
      res.status(201).json(savedPreposition);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  });




// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});