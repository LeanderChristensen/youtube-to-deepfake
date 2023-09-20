# Youtube to deepfake

Clone voices straight from YouTube videos using the Elevenlabs API. Insert a YouTube link, clone the voice from the audio in the video, and generate text-to-speech audio.

Try here: Demo no longer available

![link page](https://i.imgur.com/CZN3UPv.png)
![tts page](https://i.imgur.com/kSzy0pp.png)

## Local Install

If you want to run this app locally, please make sure you have the following installed:

- Node.js (https://nodejs.org)
- ffmpeg (sudo apt-get install ffmpeg / https://ffmpeg.org)
- A valid [ElevenLabs API subscription](http://elevenlabs.io) (starting at $5)

1. Clone this repository to your local machine:
```
git clone https://github.com/your-username/youtube-to-deepfake.git
```
2. Navigate to the project's directory:
```
cd youtube-to-deepfake
```
3. Install the required dependencies by running:
```
npm install
```
4. Open the .env.sample file and set the value of ELEVENLABS_API_KEY to your [ElevenLabs API key](https://elevenlabs.io). Then rename it to .env

5. Set the ffmpegPath in app.js to the path where your ffmpeg binary is installed on your system (find out with linux command: which ffmpeg)

6. Start the application:
```
node app.js
```


