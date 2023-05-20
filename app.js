const express = require('express');
const fs = require('fs');
const YoutubeMp3Downloader = require('youtube-mp3-downloader');
const axios = require('axios');
const FormData = require('form-data');
const fsExtra = require('fs-extra');
const http = require('http');
const https = require('https');
const app = express();
const port = 3000;
const server = http.createServer(app);
require('dotenv').config();
const apiKey = process.env.ELEVEN_LABS;

const VOICES_MAX = 10; // Max number of voices allowed
var voices = [];
let timeouts = {};

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
	res.render("index");
});

async function download(url) {
	const YD = new YoutubeMp3Downloader({
	  ffmpegPath: '/opt/homebrew/Cellar/ffmpeg/6.0/bin/ffmpeg',
	  outputPath: 'cache',
	  youtubeVideoQuality: 'highestaudio',
	  queueParallelism: 5,
	  progressTimeout: 500
	});
  
	YD.on('error', function (error) {
	  console.log(error);
	});
  
	try {
		var id;
		if (url.search(".be/") == -1) {
			id = url.split('v=')[1].split('&')[0];
		} else {
			id = url.split('.be/')[1].split('?')[0];
		}
		return new Promise((resolve, reject) => {
			YD.on('finished', function (error, data) {
				if (error) {
					console.log(error);
					reject(error);
				} else {
					console.log('\nDownload and conversion complete');
					resolve(data.file);
				}
			});
			YD.download(id);
		});
	} catch (error) {
	  console.error(error);
	}
};

async function next(file, retryCount = 0) {
  console.log(file);
  const formData = new FormData();
  if (file) { // add a null check for file
    formData.append('name', file);
    const fileName = file.split("/");
    formData.append('files', fs.createReadStream(file), {
      filename: fileName[1],
      contentType: 'audio/mpeg',
    });
    formData.append('description', '');
    formData.append('labels', '');
  } else {
    throw new Error('File is null or undefined');
  }
  try {
    const response = await axios.post('https://api.elevenlabs.io/v1/voices/add', formData, {
      headers: {
        'accept': 'application/json',
        'xi-api-key': apiKey,
        ...formData.getHeaders(),
      },
    });
    console.log(response.data);
    fs.unlink(file, (err) => {
      if (err) {
        console.error(err);
      }
    });
    return response.data.voice_id; // return the voice_id
  } catch (error) {
    console.error(error);
    if (error.response && error.response.status === 403 && retryCount < 3) {
      console.log(`Retrying request for ${file} - retry count: ${retryCount}`);
      return next(file, retryCount + 1); // retry the request with the same file
    }
    throw error;
  }
}


async function tts(text, voice_id) {
	setUserTimeout(voice_id);
	const data = {
	  text: text,
	  voice_settings: {
		stability: 0,
		similarity_boost: 0
	  }
	};
	const config = {
	  headers: {
		'accept': 'audio/mpeg',
		'xi-api-key': apiKey,
		'Content-Type': 'application/json'
	  },
	  responseType: 'arraybuffer'
	};
	try {
	  const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, data, config);
	  const base64response = Buffer.from(response.data).toString('base64');
	  return base64response;
	} catch (error) {
	  console.error(error);
	  return null;
	}
}  

app.post('/download', async function (req, res) {
	console.log(`url: ${req.body.url}`);
	const file = await download(req.body.url);
	const voiceIds = await getVoices();
	if (voiceIds.length < VOICES_MAX) {
		const voiceId = await next(file);
		setUserTimeout(voiceId);
		voices.push(voiceId);
		res.json({ voice_id: voiceId });
	} else {
		res.json(0);
	}
});

app.post('/tts', async function (req, res) {
	console.log(`TTS: ${req.body.text}`);
	console.log(`voice_id: ${req.body.voice_id}`);
	const audio = await tts(req.body.text, req.body.voice_id);
	res.set('Content-Type', 'audio/mpeg');
	res.send(audio);
});

async function deleteVoice(voice) {
	const config = {
		headers: {
		  'xi-api-key': apiKey
		}
	};
	try {
		const response = await axios.delete(`https://api.elevenlabs.io/v1/voices/${voice}`, config);
		console.log(`Deleted ${voice}`);
	} catch (error) {
		console.error(`Error deleting voice ${voice}: ${error.message}`);
	}
}

function setUserTimeout(userId) {
	clearTimeout(timeouts[userId]);
	timeouts[userId] = setTimeout(() => {
		delete timeouts[userId]; // Disconnect user
		deleteVoice(userId); // Remove the timeout ID for this user
	}, 10 * 60 * 1000); // 10 minutes
}

async function getVoices() {
	const config = {
		headers: {
		  'xi-api-key': apiKey
		}
	};
	try {
		const response = await axios.get(`https://api.elevenlabs.io/v1/voices`, config);
		const clonedVoices = response.data.voices.filter(voice => voice.category === "cloned");
		const voiceIds = clonedVoices.map(voice => voice.voice_id);
		return voiceIds;
	} catch (error) {
		console.error(`Error getting voices: ${error.message}`);
	}
}

async function cleanUp() {
	const voiceIds = await getVoices();
	voiceIds.forEach(voiceId => {
		deleteVoice(voiceId);
	});
	fsExtra.emptyDirSync('cache');
}

app.get('/checkSessionExpired/:userId', async function (req, res) {
	const { userId } = req.params;
	if (timeouts[userId]) { res.send(true) }
});

app.get('/checkIfFull', async function (req, res) {
	const voiceIds = await getVoices();
	if (voiceIds.length == VOICES_MAX) {
		res.send(true);
	} else { res.json(1); }
});

server.listen(3000, () => {
	console.log('Listening on localhost:3000');
	cleanUp();
});
