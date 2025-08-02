let strings = [];
let idCounter = 1;

// Create a string
const createString = (req, res) => {
   const { text } = req.body;

   if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Valid string is required' });
   }

   const stringObj = {
      id: idCounter++,
      text
   };

   strings.push(stringObj);
   res.status(201).json(stringObj.text);
};

// Read all strings
const getAllStrings = (req, res) => {
   const stringArray = strings.map(s => s.text);
   res.json(stringArray.join(', '));
};

// Read a single string by ID
const getStringById = (req, res) => {
   const stringObj = strings.find(s => s.id === parseInt(req.params.id));

   if (!stringObj) {
      return res.status(404).json({ error: 'String not found' });
   }

   res.json(stringObj.text);
};

// Update a string
const updateString = (req, res) => {
   const stringIndex = strings.findIndex(s => s.id === parseInt(req.params.id));

   if (stringIndex === -1) {
      return res.status(404).json({ error: 'String not found' });
   }

   const { text } = req.body;

   if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Valid string is required' });
   }

   strings[stringIndex].text = text;
   res.json(strings[stringIndex].text);
};

// Delete a string
const deleteString = (req, res) => {
   const stringIndex = strings.findIndex(s => s.id === parseInt(req.params.id));

   if (stringIndex === -1) {
      return res.status(404).json({ error: 'String not found' });
   }

   const deletedString = strings.splice(stringIndex, 1)[0].text;
   res.json(deletedString);
};

module.exports = {
   createString,
   getAllStrings,
   getStringById,
   updateString,
   deleteString
};