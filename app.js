const express = require('express');
const fs = require('fs');
const YoutubeMp3Downloader = require('youtube-mp3-downloader');
const axios = require('axios');
const FormData = require('form-data');
const fsExtra = require('fs-extra');
const socketio = require('socket.io');
const http = require('http');
const app = express();
const port = 3000;
const server = http.createServer(app);
require('dotenv').config();
const apiKey = process.env.ELEVEN_LABS;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
const io = socketio(server);

app.get('/', (req, res) => {
	res.render("index");
});

var YD = new YoutubeMp3Downloader({
	'ffmpegPath': '/opt/homebrew/Cellar/ffmpeg/6.0/bin/ffmpeg', // Where is the FFmpeg binary located?
	'outputPath': 'cache', // Where should the downloaded and encoded files be stored?
	'youtubeVideoQuality': 'highestaudio', // What video quality should be used?
	'queueParallelism': 2, // How many parallel downloads/encodes should be started?
	'progressTimeout': 500 // How long should be the interval of the progress reports
});



YD.on('error', function(error) {
	console.log(error);
});

YD.on('progress', function(progress) {
	const percentage = Math.floor(progress.progress.percentage);
	process.stdout.write(`Downloading and converting to mp3 - ${percentage}%\r`);
	io.emit('progress', percentage);
});

async function download(url) {
	const id = url.split('v=')[1];
	return new Promise((resolve, reject) => {
		YD.on('finished', function (error, data) {
		  if (error) {
			console.log(error);
			reject(error); // reject the Promise if there's an error
		  } else {
			console.log('\nDownload and conversion complete');
			resolve(data.file); // resolve the Promise with the file name
		  }
		});
		YD.download(id);
	  });
};

async function next(file) {
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
		throw error; // throw the error to be caught in the calling function
	}
}

async function tts(text, voice_id) {
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
	const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, data, config);
	const base64response = Buffer.from(response.data).toString('base64');
	return base64response;
}

fsExtra.emptyDirSync('cache');

app.post('/download', async function (req, res) {
	console.log(`url: ${req.body.url}`);
	const file = await download(req.body.url);
	const voiceId = await next(file);
	res.json({ voice_id: voiceId });
});

app.post('/tts', async function (req, res) {
	console.log(`TTS: ${req.body.text}`);
	console.log(`voice_id: ${req.body.voice_id}`);
	const audio = await tts(req.body.text, req.body.voice_id);
	res.set('Content-Type', 'audio/mpeg');
	res.send(audio);
});

server.listen(3000, () => {
	console.log('Listening on localhost:3000');
});