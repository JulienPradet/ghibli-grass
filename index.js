import random from "canvas-sketch-util/random";
import { hsvToFillStyle } from "./util";

const canvas = document.querySelector("#canvas");

async function draw() {
  console.log("draw");
  canvas.style.opacity = 0.7;
  await tick();

  random.setSeed(random.getRandomSeed());

  // I prefer portrait renders
  // -> less flowers on the front which feels a bit more natural
  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);
  const ctx = canvas.getContext("2d");

  const widthRatio = 0.3;
  const horizonHeight = height * random.gaussian(0.67, 0.01);
  const maxGrassSize = horizonHeight / 2.5;
  const minGrassSize = 5; // The smaller, the better, but the slower
  const enableFlowers = true;
  const minFlowerSize = 0.1;
  const maxFlowerSize = maxGrassSize / 15;

  const sky = Color(185 / 360, 0.73, 0.83);
  const darkSky = Color(186 / 360, 0.89, 0.68);

  const greenVariance = 1; // 0 to 1 but higher brings a lot of contrast
  const youngGreen = Color(0.24, 0.5, 0.8); // yellowish and lighter
  const oldGreen = Color(0.41, 0.7, 0.68); // blueish and darker

  const flowerColor = Color(0.99, 0.78, 0.88); // red
  // const flowerColor = Color(0.01, 0, 0.9); // white

  drawSky();

  let grassSize = maxGrassSize;
  let grasses = [];

  // We start from the horizon to the bottom of the screen so that
  // elements near the horizon appear behind the ones closer to us
  for (let y = horizonHeight; y >= -maxGrassSize; y -= grassSize / 4) {
    // ty = 0 -> bottom of the screen
    // ty = 1 -> on the horizon
    let ty = Math.min(1, Math.max(0, y / horizonHeight));
    const depth = Math.pow(ty * 0.98, 3.5);

    grassSize = Math.min(
      Math.max(minGrassSize, (1 - Math.pow(ty, 0.8)) * maxGrassSize),
      maxGrassSize
    );

    // Instead of appending to grasses directly, we're using two separate
    // arrays to push the flowers behind the grasses of the same row
    let grassesRow = [];
    let flowersRow = [];
    for (let x = 0; x < width; x += (grassSize * widthRatio) / 3) {
      // tx = 0 -> left
      // tx = 1 -> right
      let tx = x / width;

      // Depending on the soil, the color of the grass is different
      // so we're grouping the colors of the grass thanks to a 2D noise
      // 0 -> youngGreen
      // 1 -> oldGreen
      const xWithDepth = Math.pow(tx, depth + 1);
      const greenValue =
        (random.noise2D(xWithDepth * 1.5, depth * 7) + 1) * 0.5 * greenVariance;

      // the farthest, the less saturation
      // the closest, the darker value
      let grassColor = Color(
        youngGreen.h + Math.pow(greenValue, 0.5) * (oldGreen.h - youngGreen.h),
        youngGreen.s +
          Math.pow(greenValue, 0.5) * (oldGreen.s - youngGreen.s) -
          Math.pow(ty, 4) * 0.1,
        youngGreen.v +
          Math.pow(greenValue, 0.5) * (oldGreen.v - youngGreen.v) -
          0.09 * (1 - ty) -
          greenValue * 0.2 * Math.pow(1 - ty, 0.2)
      );

      // Let's add a bit of randomisation to make it more intesting
      // If we don't do this, we'll get too smooth transitions.
      // To achieve a proper ghibli style, we should try
      // to make a bit less randomness and more "steps" in the colors
      grassColor = Color(
        grassColor.h + random.gaussian(0, 0.1) * 0.05,
        grassColor.s + random.gaussian(0, 0.1) * 0.015,
        grassColor.v + random.gaussian(0, 0.1) * 0.08
      );

      // Even though we're working with rows, we need
      // to hide them from the user point of view by adding randomness
      let grassX = x + random.gaussian(0, grassSize / 60);

      const hillY = random.noise2D(xWithDepth / 2, depth * 1.5) * 50;

      let grassY =
        y +
        hillY +
        random.gaussian(0, grassSize / 60) -
        random.value() * grassSize * 0.5;

      grassesRow.push(
        Grass(
          grassSize,
          grassX,
          grassY,
          grassColor,
          widthRatio * (random.value() * 0.3 + 0.7),
          random.gaussian(0, 0.2) + random.noise2D(tx, Math.pow(ty, 3.5)) * 0.5,
          depth
        )
      );

      // Now let's add flowers
      if (!enableFlowers) {
        continue;
      }
      // They should also work by batch:
      // 1. another noise2D to make the first group behavior
      // 2. younger/yellower grass wouldn't work that well for growing flowers
      // 3. we need to lower the number of flowers compared to the number of grass
      const flowerField = random.noise2D(
        xWithDepth + 1000,
        Math.pow(ty * 0.95, 4) * 10
      );
      const grassFieldThreshold = greenValue * 0.01;
      if (
        flowerField < grassFieldThreshold * (1 - ty) &&
        random.value() < 0.8 * (flowerField + 1)
      ) {
        const flowerX = x + random.gaussian(0, grassSize / 5);
        // It should be high enough compared to the grass of the same row,
        // but low enough to be hidden from time to time
        const flowerY =
          y + hillY + grassSize * 0.6 + random.gaussian(0, grassSize / 5);

        const flowerSize =
          Math.max(minFlowerSize, (1 - ty) * maxFlowerSize) *
          random.gaussian(0.7, 0.1);

        // let's hide way too small flowers altogether
        // but by using random it's a bit smoother transition
        if (random.value() > flowerSize) {
          continue;
        }

        flowersRow.push(
          Flower(
            flowerX,
            flowerY,
            flowerSize,
            Color(
              (flowerColor.h + random.gaussian(0, 0.01) + 1) % 1,
              flowerColor.s + Math.pow(ty, 2) * 0.1 - (1 - greenValue) * 0.05,
              flowerColor.v + Math.pow(ty, 0.5) * 0.05 - greenValue * 0.05,
              // If we're too far, we wouldn't be able to see
              // too much details, hence the opacity decrease
              Math.pow(1 - ty, 0.3)
            ),
            depth
          )
        );
      }
    }

    grasses = grasses.concat(flowersRow).concat(grassesRow);
  }

  // We want to avoid having too much grass elements, but still
  // not feel any gap between the leaves.
  // The base is a square that is mostly invisible that helps hiding
  // those gaps.
  grasses.forEach((grass) => {
    if (grass.__type === "Grass") {
      drawBase(grass);
    }
  });

  grasses.forEach((grass) => {
    if (grass.__type === "Flower") {
      drawFlower(grass);
    } else if (grass.__type === "Grass") {
      drawGrass(grass);
    }
  });

  await tick();
  canvas.style.opacity = 1;

  function Color(h, s, v, a = 1) {
    return {
      h,
      s,
      v,
      a,
    };
  }

  function Grass(
    grassSize,
    grassX,
    grassY,
    grassColor,
    widthRatio,
    orientation,
    depth
  ) {
    return {
      __type: "Grass",
      size: grassSize,
      x: grassX,
      y: grassY,
      color: grassColor,
      widthRatio: widthRatio,
      orientation,
      depth,
    };
  }

  function Flower(flowerX, flowerY, size, color, depth) {
    return {
      __type: "Flower",
      x: flowerX,
      y: flowerY,
      size: size,
      color: color,
      depth,
    };
  }

  function drawGrass({ size, x, y, color, widthRatio, orientation, depth }) {
    const width = size * widthRatio;
    const bottomLeftX = x - width / 2;
    const topPositionX = x + width * orientation;
    const bottomRightX = x + width / 2;

    ctx.fillStyle = hsvToFillStyle(color);
    ctx.beginPath();
    ctx.moveTo(bottomLeftX, y);
    ctx.bezierCurveTo(
      bottomLeftX,
      y + size * 0.2,
      bottomLeftX * 0.8 + topPositionX * 0.2,
      y + size * 0.8,
      topPositionX,
      y + size
    );
    ctx.bezierCurveTo(
      bottomRightX * 0.8 + topPositionX * 0.2,
      y + size * 0.5,
      bottomRightX,
      y + size * 0.2,
      bottomRightX,
      y
    );
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hsvToFillStyle(sky);
    ctx.globalAlpha = Math.pow(depth, 2) * 0.45;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawBase({ size, x, y, color, widthRatio, depth }) {
    ctx.fillStyle = hsvToFillStyle(color);
    ctx.fillRect(
      x - size * widthRatio * 0.5,
      y - size,
      size * widthRatio,
      size
    );

    ctx.fillStyle = hsvToFillStyle(sky);
    ctx.globalAlpha = Math.pow(depth, 2) * 0.45;
    ctx.fillRect(
      x - size * widthRatio * 0.5,
      y - size,
      size * widthRatio,
      size
    );
    ctx.globalAlpha = 1;
  }

  function drawFlower({ x, y, size, color, depth }) {
    ctx.fillStyle = hsvToFillStyle(color);

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = hsvToFillStyle(
      Color(color.h, color.s * 0.1, color.v * 0.3, color.a)
    );
    ctx.beginPath();
    ctx.arc(x, y - size * 0.6, size * 0.3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = hsvToFillStyle(sky);
    ctx.globalAlpha = Math.pow(depth, 2) * 0.45;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawSky() {
    const skyGradient = ctx.createLinearGradient(0, horizonHeight, 0, height);
    skyGradient.addColorStop(0, hsvToFillStyle(sky));
    skyGradient.addColorStop(1, hsvToFillStyle(darkSky));

    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);
  }
}

draw();

document.body.addEventListener("click", function () {
  draw();
});
document.body.addEventListener("keyup", function (event) {
  console.log(event);
  if (event.key === " ") {
    draw();
  }
});

let resizeTimeout;
window.addEventListener("resize", function (event) {
  canvas.style.opacity = 0.7;

  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(async () => {
    await draw();
    resizeTimeout = null;
  }, 100);
});

function tick() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });
}
