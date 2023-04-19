const express = require('express');
const fs = require('fs');
const YoutubeMp3Downloader = require('youtube-mp3-downloader');
const axios = require('axios');
const FormData = require('form-data');
const fsExtra = require('fs-extra');
const app = express();
const port = 3000;
require('dotenv').config();
const apiKey = process.env.ELEVEN_LABS;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

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

YD.on('finished', function(error, data) {
    if (error) {
        console.log(error);
    } else {
        console.log('\nDownload and conversion complete');
		next(data.file);
    }
});

YD.on('error', function(error) {
	console.log(error);
});

YD.on('progress', function(progress) {
	process.stdout.write(`Downloading and converting to mp3 - ${Math.floor(progress.progress.percentage)}%\r`);
});

async function download(url) {
	const id = url.split('v=')[1];
	YD.download(id);
};

async function next(file) {
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
		fs.unlink(file);
		return response.data.voice_id; // return the voice_id
	} catch (error) {
		console.error(error);
		throw error; // throw the error to be caught in the calling function
	}
}

async function tts(file) {
	console.log(file);
	const formData = new FormData();
	formData.append('name', file);
	const fileName = file.split("/");
	formData.append('files', fs.createReadStream(file), {
		filename: fileName[1],
		contentType: 'audio/mpeg',
	});
	formData.append('description', '');
	formData.append('labels', '');
	
	axios.post(`https://api.elevenlabs.io/v1/text-to-speech/{$voice_id}`, formData, {
	  headers: {
		'accept': 'application/json',
		'xi-api-key': apiKey,
		...formData.getHeaders(),
	  },
	})
	  .then(response => {
		console.log(response.data);
		fs.unlink(file);
	  })
	  .catch(error => {
		console.error(error);
	  });
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
	await tts(req.body.text);
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
});