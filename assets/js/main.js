
(function() {

function addStatsJS(type) {
	let stats = new Stats();
	stats.showPanel(type); // 0: fps, 1: ms, 2: mb, 3+: custom
	document.body.appendChild(stats.dom);
	requestAnimationFrame(function loop() {
		stats.update();
		requestAnimationFrame(loop);
	});
}

function resizeCanvasToDisplaySize(canvas, pixelRatio) {
	pixelRatio = pixelRatio || 1;
	const width  = canvas.clientWidth * pixelRatio | 0;
	const height = canvas.clientHeight * pixelRatio | 0;
	if (canvas.width !== width ||  canvas.height !== height) {
		// canvas.width = width;
		// canvas.height = height;
		canvas.width = width < 800 ? width : 800;
		canvas.height = canvas.width * height / width;
		return true;
	}
	return false;
}

function colorToUint(r, g, b) {
	return r | (g << 8) | (b << 16) | 0xFF000000;
}

function mod(x, y) {
	return x - y * Math.floor(x / y);
}

function fract(x) {
	return x - Math.floor(x);
}

function clamp(x, xmin, xmax) {
	return Math.min(Math.max(x, xmin), xmax);
}

function resizeCanvas() {

	if (resizeCanvasToDisplaySize(canvas)) {

		imageData = ctx.createImageData(canvas.width, canvas.height);
		buffer = new ArrayBuffer(canvas.width * canvas.height * 4);
		buffer8 = new Uint8Array(buffer);
		buffer32 = new Uint32Array(buffer);
		return true;
	}
	return false;
}

// Util class for downloading the png
function loadImagesAsync(urls) {
	return new Promise((resolve, reject) => {

		let pending = urls.length;
		const result = [];
		if (pending === 0) {
			resolve(result);
			return;
		}
		urls.forEach(function(url, i) {
			const image = new Image();
			image.addEventListener("load", () => {
				const tmpCanvas = document.createElement("canvas");
				const tmpCtx = tmpCanvas.getContext("2d");

				tmpCanvas.width = map.width;
				tmpCanvas.height = map.height;
				tmpCtx.drawImage(image, 0, 0, map.width, map.height);
				
				result[i] = tmpCtx.getImageData(0, 0, map.width, map.height).data;
				pending--;
				if (pending === 0) {
					resolve(result);
				}
			});
			image.src = url;
		});
	});
}

function loadMap(heightmapName, colormapName)
{
	const path = "assets/maps/";
	loadImagesAsync([path+heightmapName+".png", path+colormapName+".png"]).then(onLoadedImages);
}

function onLoadedImages(result)
{
	const dataC = result[0];
	const dataH = result[1];
	for(var i=0; i<map.width*map.height; i++)
	{
		map.colormap[i] = 0xFF000000 | (dataC[(i<<2) + 2] << 16) | (dataC[(i<<2) + 1] << 8) | dataC[(i<<2) + 0];
		map.heightmap[i] = dataH[i<<2];
	}
}

addStatsJS(0);

const canvas = document.getElementById("main-canvas");
const ctx = canvas.getContext("2d");

const gui = new lil.GUI();

let imageData = ctx.createImageData(canvas.width, canvas.height);
let buffer = new ArrayBuffer(canvas.width * canvas.height);
let buffer8 = new Uint8Array(buffer);
let buffer32 = new Uint32Array(buffer);

const camera = {
	x: 512.0, y: 800.0,
	angle: 0.0,
	height: 78.0,
	horizon: 100.0,
	distance: 800,
	voxels: false
}

const map = {
	width: 1024,
	height: 1024,
	shift: 10, // 2 ^ 8 = 256
	heightmap: new Uint8Array(1024*1024),
	colormap: new Uint32Array(1024*1024)
}

const input = {
	left: false,
	right: false,
	up: false,
	down: false,
	q: false,
	e: false,
	space: false,
	shift: false
}

const bgColor = colorToUint(100, 160, 215)|0;

function mouseMoved(event) {

}

function mousePressed(event) {
	
}

function mouseReleased(event) {
	
}

function setInputs(keyCode, value) {
	switch (keyCode) {
	case 37:
	case 65:
		input.left = value;
		break;
	case 39:
	case 68:
		input.right = value;
		break;
	case 38:
	case 87:
		input.up = value;
		break;
	case 40:
	case 83:
		input.down = value;
		break;
	case 32:
		input.space = value;
		break;
	case 16:
		input.shift = value;
		break;
	case 81:
		input.q = value;
		break;
	case 69:
		input.e = value;
		break;
	}
}

function keyPressed(event) {
	setInputs(event.keyCode, true);
}

function keyReleased(event) {
	setInputs(event.keyCode, false);
}

function setupGUI() {
	gui.add(camera, "x").listen();
	gui.add(camera, "y").listen();
	gui.add(camera, "angle", 0.0, Math.PI * 2.0, 0.01).listen();
	gui.add(camera, "height").listen();
	gui.add(camera, "horizon").listen();
	gui.add(camera, "distance").step(1);
	gui.add(camera, "voxels");
}

let fpsTimePrev = new Date().getTime();

function init() {

	resizeCanvas();

	document.addEventListener("resize", resizeCanvas);

	document.addEventListener("mousemove", mouseMoved);
	document.addEventListener("touchmove", mouseMoved);
	document.addEventListener("mousedown", mousePressed);
	document.addEventListener("touchstart", mousePressed);
	document.addEventListener("mouseup", mouseReleased);
	document.addEventListener("touchend", mouseReleased);
	document.addEventListener("keydown", keyPressed);
	document.addEventListener("keyup", keyReleased);

	for (let y = 0; y < map.height; y++) {
		for(let x = 0; x < map.width; x++) {
			const i = x + y * map.width;
			const h = fract(Math.sin(y * 20.0 * Math.PI / map.height)*Math.cos(x * 12.0 * Math.PI / map.width) * 0.5 + 0.5) * 0.5;
			map.heightmap[i] = Math.floor(h * 255)|0;
			map.colormap[i] = colorToUint(map.heightmap[i], Math.floor(map.heightmap[i]*0.4), Math.floor(map.heightmap[i]*0.2));
		}
	}

	loadMap("C1W", "D1");
	setupGUI();
}

function drawVerticalLine(x, top, bottom, color) {

	const screenWidth = canvas.width|0;

	if (top < 0)
		top = 0;
	if (top > bottom)
		return;

	let idx = ((top * screenWidth) + x)|0;
	for (let y = top|0; y < bottom|0; y = y+=1|0) {
		buffer32[idx] = color|0;
		idx = idx + screenWidth|0;
	}
}

function drawBackground() {
	for (let i = 0; i < buffer32.length; i++)
		buffer32[i] = bgColor|0;
}

function blit() {
	imageData.data.set(buffer8);
	ctx.putImageData(imageData, 0, 0);
}

function renderLinear() {

	const mapWidthN1 = map.width - 1;
	const mapHeightN1 = map.height - 1;
	const screenWidth = canvas.width|0;

	let deltaZ = 1.0;

	const yDepth = new Int32Array(canvas.width);

	for (let i = 0; i < screenWidth|0; i+=1|0)
		yDepth[i] = canvas.height;

	let cost = Math.cos(camera.angle);
	let sint = Math.sin(camera.angle);

	for (let z = 1; z < camera.distance; z += deltaZ) {

		let rdx = -cost * z - sint * z;
		let rdy =  sint * z - cost * z;

		let rdx1 =  cost * z - sint * z;
		let rdy1 = -sint * z - cost * z;

		let dx = (rdx1 - rdx) / screenWidth;
		let dy = (rdy1 - rdy) / screenWidth;

		rdx += camera.x;
		rdy += camera.y;

		const invZ = 1.0 / z * 240.0;

		for (let x = 0; x < screenWidth|0; x+=1|0) {

			const idx = ((Math.floor(rdy) & mapHeightN1) << map.shift) + (Math.floor(rdx) & mapWidthN1)|0;
			const projY = ((camera.height - map.heightmap[idx]) * invZ + camera.horizon)|0;

			drawVerticalLine(x, projY, yDepth[x], map.colormap[idx]);

			if (projY < yDepth[x])
				yDepth[x] = projY;

			rdx += dx;
			rdy += dy;
		}
		deltaZ += 0.005;
	}
}

function renderVoxels() {

	const mapWidthN1 = map.width - 1;
	const mapHeightN1 = map.height - 1;
	const screenWidth = canvas.width|0;
	const screenHeight = canvas.height|0;

	const px = camera.x - 0.5;
	const py = camera.y - 0.5;

	const tpx = Math.floor(px)|0;
	const tpy = Math.floor(py)|0;

	const fx = tpx - px + 0.5;
	const fy = tpy - py + 0.5;

	const cost = Math.cos(camera.angle);
	const sint = Math.sin(camera.angle);

	let rdx = -cost - sint;
	let rdy =  sint - cost;

	const rdx1 =  cost - sint;
	const rdy1 = -sint - cost;

	const dx = (rdx1 - rdx) / screenWidth;
	const dy = (rdy1 - rdy) / screenWidth;

	for (let x = 0; x < screenWidth; x++) {

		let stepX = rdx < 0 ? -1 : 1;
		let stepY = rdy < 0 ? -1 : 1;

		let ddx = stepX / rdx;
		let ddy = stepY / rdy;

		let tx = tpx;
		let ty = tpy;

		let sdx = (stepX * fx + 0.5) * ddx;
		let sdy = (stepY * fy + 0.5) * ddy;

		let yDepth = screenHeight;
		// let bigStep = false;

		for (let i = 0; i < camera.distance; i++) {

			const idx = ((ty & mapHeightN1) << map.shift) + (tx & mapWidthN1)|0;

			// if (i > camera.distance * 0.25 && !bigStep) {
			// 	ddx *= 2.0;
			// 	ddy *= 2.0;
			// 	stepX *= 2;
			// 	stepY *= 2;
			// 	bigStep = true;
			// }

			let z;
			if (sdx < sdy) {
				z = sdx;
				tx += stepX;
				sdx += ddx;
			} else {
				z = sdy;
				ty += stepY;
				sdy += ddy;
			}

			const invZ = 1.0 / z * 240.0;

			const projY = ((camera.height - map.heightmap[idx]) * invZ + camera.horizon)|0;

			drawVerticalLine(x, projY, yDepth, map.colormap[idx]);

			if (projY < yDepth)
				yDepth = projY;

		}
		rdx += dx;
		rdy += dy;
	}
}

function renderVoxelsHorizontal() {

}

let prevTime = 0;
let frames = 0;
function render(currentTime) {
	const deltaTime = (currentTime - prevTime) / 1000.0;

	const angleSens = 1.0 * deltaTime;
	if (input.left) {
		camera.angle += angleSens;
	}
	if (input.right) {
		camera.angle -= angleSens;
	}
	if (input.q) {
		camera.horizon += 500.0 * deltaTime;
	}
	if (input.e) {
		camera.horizon -= 500.0 * deltaTime;
	}

	let cosf = Math.cos(camera.angle + Math.PI * 0.5);
	let sinf = Math.sin(camera.angle + Math.PI * 0.5);

	let fw = 100.0 * deltaTime;
	if (input.up) {
		camera.x +=  cosf * fw;
		camera.y += -sinf * fw;
	}
	if (input.down) {
		camera.x -=  cosf * fw;
		camera.y -= -sinf * fw;
	}

	if (input.space) {
		camera.height += 100.0 * deltaTime;
	}
	if (input.shift) {
		camera.height -= 100.0 * deltaTime;
	}

	drawBackground();

	if (camera.voxels)
		renderVoxels();
	else
		renderLinear();

	blit();

	prevTime = currentTime;
	frames++;

	requestAnimationFrame(render);
}

init();
requestAnimationFrame(render);

})();