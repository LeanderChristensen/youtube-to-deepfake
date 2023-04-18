const express = require('express');
//const fs = require('fs');
const YoutubeMp3Downloader = require('youtube-mp3-downloader');
const app = express();
const port = 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
	res.render("index");
})

var YD = new YoutubeMp3Downloader({
	'ffmpegPath': '/opt/homebrew/Cellar/ffmpeg/6.0/bin/ffmpeg', // Where is the FFmpeg binary located?
	'outputPath': 'cache', // Where should the downloaded and encoded files be stored?
	'youtubeVideoQuality': 'highestaudio', // What video quality should be used?
	'queueParallelism': 2, // How many parallel downloads/encodes should be started?
	'progressTimeout': 2000 // How long should be the interval of the progress reports
});

async function download(url) {
	const id = url.split('v=')[1];
	console.log(id);
	YD.download(id);
	YD.on('finished', function(data) {
		console.log(JSON.stringify(data));
	});

	YD.on('error', function(error) {
		console.log(error);
	});

	YD.on('progress', function(progress) {
		console.log(JSON.stringify(progress));
	});
};

async function next() {
	console.log('next function');
}

app.post('/download', async function (req, res) {
	console.log(`url: ${req.body.url}`);
	await download(req.body.url);
	//await next();
});

app.listen(port, () => {
	console.log(`Example app listening on port ${port}`);
})