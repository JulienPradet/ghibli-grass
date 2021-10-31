## A grass field inspired by Ghibli's backgrounds

* pure js canvas
* made in the context of [SableRaf](https://github.com/SableRaf)'s WCCChallenge

Run locally by running the following commands:

```
npm install
npm run dev
```

You can then open http://localhost:3000

To export a video, when the page downloads the `export.zip`, put it in a folder, open this folder in a CLI and run the following commands (it'll destroy any previous video):

```
rm -rf "./*.{mp4,png}" && unzip export.zip && ffmpeg -framerate 25 -i %03d.png -c:v libx264 -profile:v high -crf 20 -pix_fmt yuv420p output.mp4
```