/*
Images are loaded through loadImages.js
*/

var ctx = document.getElementById("ctx").getContext("2d");

ctx.textAlign="left";
ctx.textBaseline="top";

var HEIGHT = 700;
var WIDTH = 700;

var mouseX = 0;
var mouseY = 0;

var index = 0;

var variablesSet = false;
var mapCreated = false;

//Declare variables, some of them set later (setVariables() function)
var columns = 5;
var mainColumnSize = 6;

//Hexagon object - contains objects of each hexagon, named by a number (first index is 0)
var hex = {};

var hexXpos = 275;	//Pozice, kde začíná mapa (kde se nachází hexagon s indexem 0)
var hexYpos = 280;

var mouseHexColliding = -1;		//What hexagon is mouse hovering over. If none, -1.
var mouseUIcolliding = -1;		//What UI element is mouse hovering over. If none, -1.

var placingBuilding = -1;		//What building player has selected. If none, -1. 	//ID stavby = id stavby v UI.

var hexSelected = -1;		//What hexagon player has selected. If none, -1.

var showUnitUI = false;		//Jestli se má zobrazovat lišta pro trénování jednotek (zobrazuje se, pokud je označena nějaká země a je v ní budovu pro výcvik).

var hexMoveAvailable = [];		//If a hexagon is selected, it shows available moves. This array contains the id of hexagons, where the movement is possible.

//UI
var ui = {};
var uiHidden = {};

//Initial functions
createMap = function(columns,mainColumnSize){
	//Calculate hexCount
	var hexCount = mainColumnSize;
	var sideColumns = (columns - 1) / 2;
	for(var col = 1; col <= sideColumns; col++){
		hexCount += (mainColumnSize - col) * 2;
	}

	//Create the map
	var currentColFromMain = sideColumns;		//Jak daleko je momentální sloupec vzdálen od středu
	var currentDist = sideColumns;					//Jak daleko je momentální sloupec vzdálen od středu - pomocná proměnná
	var currentCol = 1;
	var currentColPos = 1;
	var currentColSize;

	//Create the hexagon objects, set their variables
	for(var id = 0; id < hexCount; id++){
		hex[id] = {};

		currentColSize = mainColumnSize - currentColFromMain;

		//Variables
		hex[id].x = hexXpos + (Img.hex.width*(currentCol-1) * 0.75);	//Musí se vynásobit 0.75, aby do sebe hexagony přesně zapadaly - jinak by byly daleko od sebe
		hex[id].y = hexYpos + Img.hex.height*(currentColPos-1) - Img.hex.height*(sideColumns-currentColFromMain) / 2 - currentColPos;
		hex[id].column = currentCol;
		hex[id].line = currentColPos + mainColumnSize - (mainColumnSize - Math.abs(currentDist)) / 2 - mainColumnSize / 2;
		hex[id].building = -1;
		hex[id].workers = 0;
		hex[id].soldiers = 0;
		hex[id].mages = 0;

		currentColPos++;
		if (currentColPos > currentColSize){
			currentColPos = 1;
			currentDist--;
			currentCol++;
			currentColFromMain = Math.abs(currentDist);
			currentColSize = mainColumnSize - currentColFromMain;
		}
	}

	mapCreated = true;
}

createUI = function(){
	//createUIelements(image, name, id, x, y, hidden)

	//Levý horní roh
	createUIelements(Img.uiInfo, "info", 0, 0, 0, false);

	//Horní lišta
	createUIelements(Img.uiTrainBar, "trainBar", 0, 120, 0, false);
	createUIelements(Img.uiEndTurn, "endTurn", 0, 570, 0, false);

	//Levá lišta
	//Přepínání mezi budovami a kouzly
	createUIelements(Img.uiBuildingSpellSwitch, "buildingSpellSwitch", 0, 0, 100, false);
	createUIelements(Img.uiBuildingSpellSwitch, "buildingSpellSwitch", 1, 60, 100, false);

	//Budovy
	var startX = 0;
	var startY = 160;
	for(var i = 0; i <= 8; i++){
		createUIelements(Img.uiBuildingBg, "building", i, 0, startY + i*Img.uiBuildingBg.height, false);
	}

	//Hidden
	//Horní lišta - skryté ikony
		//Levá část
	createUIelements(Img.writeButton1, "writeButton", 0, 180, 55, true);
	createUIelements(Img.sendButton1, "sendButton", 0, 270, 55, true);

		//Pravá část
	createUIelements(Img.writeButton1, "writeButton", 1, 400, 40, true);
	createUIelements(Img.sendButton1, "sendButton", 1, 490, 40, true);
	createUIelements(Img.writeButton1, "writeButton", 2, 400, 70, true);
	createUIelements(Img.sendButton1, "sendButton", 2, 490, 70, true);
}

createUIelements = function(image, name, id, x, y, hidden){
	/*
	Struktura
	ui[index] = {
		image: název obrázku v objektu Img
		name: jméno elementu,
		id: pokud je více elementů se stejným jménem, mají odlišné id. V základu je id 0,
		x: x,
		y: y,
	}
	*/
	if (!hidden){
		ui[index] = {
			image: image,
			name: name,
			id: id,
			x: x,
			y: y,
		}
	}
	else {
		uiHidden[index] = {
			image: image,
			name: name,
			id: id,
			x: x,
			y: y,
		}
	}


	index++;		//index = global var
}

//Input functions
document.onmousemove = function(mouse){
	mouseX = mouse.clientX - document.getElementById('ctx').getBoundingClientRect().left;
	mouseY = mouse.clientY - document.getElementById('ctx').getBoundingClientRect().top;
}

document.onclick = function(mouse){
	selectHexagon();
	placeBuilding();		//Kvůli proměnné placingBuilding musí být až po selectHexagon
}

selectHexagon = function(){
	var notUnselect = false;		//Zajistí, aby se země neodznačila hned po to, co je označena.
	//Kliknutí na zemi a nestaví budovu
	if ((mouseHexColliding !== -1) && (placingBuilding === -1)){
		//Pokud klikne na zemi, tak danou zemi označí.
		if (hexSelected === -1){
			hexSelected = mouseHexColliding;
			notUnselect = true;
		}
	}
	//Pokud má označenou zemi a klikne, tak se označení zruší. Jsou zde 2 výjimky.
	if ((hexSelected !== -1) && (notUnselect === false)) {
		var unselect = true;
		for (var i in hexMoveAvailable){
			if (hexMoveAvailable[i] === mouseHexColliding){		//Označení se nezruší, pokud klikne na sousední zemi
				unselect = false;
			}
		}

		if (mouseUIcolliding !== -1){
			if (ui[mouseUIcolliding].name === "trainBar"){			//Označení se nezruší, pokud klikne na train bar (pokud chce trénovat nebo propustit jednotky)
				unselect = false;
			}
		}

		if (unselect === true){
			hexSelected = -1;
		}
	}
}

placeBuilding = function(){
	//Pokud klikne na budovu v UI, budovu tím vybere.
	if (mouseUIcolliding !== -1){
		if (ui[mouseUIcolliding].name === "building"){
			placingBuilding = mouseUIcolliding;
		}
	}
	else {
		//Kliknutí na zemi
		if (mouseHexColliding !== -1){
			//Pokud klikne na možnou zemi, postaví se tam budova
			if (placingBuilding !== -1){
				if (hex[mouseHexColliding].building === -1){
					hex[mouseHexColliding].building = placingBuilding;
				}
			}
		}
		placingBuilding = -1;			//Pokud budovu postaví nebo ji má vybranou a klikne mimo možnou zemi, tak se zruší označení budovy.
	}
}

document.oncontextmenu = function(mouse){		//oncontextmenu = right click
	placingBuilding = -1;
	hexSelected = -1;

	return false;		//Musí být, aby se neukázalo otravné HTML okno
}

//Collision functions
checkCollision = function(){
	checkMouseHexCollision();
	checkMouseUIcollision();
}

checkMouseHexCollision = function(){
	mouseHexColliding = -1;		//Tato hodnota se změní, pokud bude colliding
	for(var i in hex){
		//Calculate X and Y difference between hexagon and mouse
		var xDiff = Math.abs(mouseX - hex[i].x);
		var yDiff = Math.abs(mouseY - hex[i].y);

		//Discard anything that's not colliding
		if (xDiff >= Img.hex.width/2 || yDiff >= Img.hex.height/2){
			continue;
		}
		else{
			if (xDiff >= Img.hex.width/4){
				var xEdge = (Img.hex.height - yDiff) * (Math.tan(30 * Math.PI / 180));
				if (xDiff >= xEdge){
					continue;
				}
			}
		}

		//Return colliding
		mouseHexColliding = i;
	}

	//Do something if colliding
}

checkMouseUIcollision = function(){
	mouseUIcolliding = -1;		//Tato hodnota se změní, pokud bude colliding
	for(var key in ui){
		if (mouseX >= ui[key].x &&
			mouseX <= ui[key].x + ui[key].image.width &&
			mouseY >= ui[key].y &&
			mouseY <= ui[key].y + ui[key].image.height){
				mouseUIcolliding = key;
			}
	}
	//Do something if colliding

}

//Draw functions
drawGame = function(){
	ctx.fillStyle = "green";
	ctx.fillRect(0,0,WIDTH,HEIGHT);

	drawHexagons();

	drawHexHover();

	drawHexAvailable();

	drawTargetHex();

	drawHexSelected();

	drawHexElements();

	//UI
	drawUI();

	drawTrainingUnits();

	drawBuildingHover();

	drawUIbuildings();
}

drawHexagons = function(){
	//ctx.drawImage(image,cropStartX,cropStartY,cropWidth,cropHeight,drawX,drawY,drawWidth,drawHeight)
	for(var id in hex){
		var centerX = hex[id].x - Img.hex.width/2;
		var centerY = hex[id].y - Img.hex.height/2;
		ctx.drawImage(Img.hex,0,0,Img.hex.width,Img.hex.height,centerX,centerY,Img.hex.width,Img.hex.height);
	}
}

drawHexHover = function(hexId){
	var hexId = mouseHexColliding;
	if (hexId !== -1 && hexSelected === -1 && placingBuilding === -1){
		var centerX = hex[hexId].x - Img.hexHover.width/2;
		var centerY = hex[hexId].y - Img.hexHover.height/2;
		ctx.drawImage(Img.hexHover,0,0,Img.hexHover.width,Img.hexHover.height,centerX,centerY,Img.hexHover.width,Img.hexHover.height);
	}
}

drawHexAvailable = function(){
	//Draw which hexagons are available when placing buildings
	if (placingBuilding !== -1){
		for(var id in hex){
			if (hex[id].building === -1){
				var centerX = hex[id].x - Img.hex.width/2;
				var centerY = hex[id].y - Img.hex.height/2;
				ctx.drawImage(Img.hexAvailable,0,0,Img.hexAvailable.width,Img.hexAvailable.height,centerX,centerY,Img.hexAvailable.width,Img.hexAvailable.height);
			}
		}
	}
}

drawTargetHex = function(){
	//Placing buildings
	if (placingBuilding !== -1){
		var hexId = mouseHexColliding;
		if (hexId !== -1){
			if (hex[hexId].building === -1){
				var centerX = hex[hexId].x - Img.hexTargeted.width/2;
				var centerY = hex[hexId].y - Img.hexTargeted.height/2;
				ctx.drawImage(Img.hexTargeted,0,0,Img.hexTargeted.width,Img.hexTargeted.height,centerX,centerY,Img.hexTargeted.width,Img.hexTargeted.height);
			}
		}
	}
	//Moving units

}

drawHexSelected = function(){
	if (hexSelected !== -1){
		for(var id in hex){
			if (id == hexSelected){
				var centerX = hex[id].x - Img.hex.width/2;
				var centerY = hex[id].y - Img.hex.height/2;
				ctx.drawImage(Img.hexSelected,0,0,Img.hexSelected.width,Img.hexSelected.height,centerX,centerY,Img.hexSelected.width,Img.hexSelected.height);
			}
		}
		drawAdjacentHexagons(hexSelected);
	}
}

drawAdjacentHexagons = function(hexSelected){
	//Draw available hexagons
	hexMoveAvailable = findAdjacentHexagons(hexSelected);
	for(var id in hexMoveAvailable){
		var centerX = hex[hexMoveAvailable[id]].x - Img.hex.width/2;
		var centerY = hex[hexMoveAvailable[id]].y - Img.hex.height/2;
		ctx.drawImage(Img.hexAvailable,0,0,Img.hexAvailable.width,Img.hexAvailable.height,centerX,centerY,Img.hexAvailable.width,Img.hexAvailable.height);

		//Highlight targeted hexagon (if targeted)
		if (hexMoveAvailable[id] === mouseHexColliding){
			ctx.drawImage(Img.hexTargeted,0,0,Img.hexTargeted.width,Img.hexTargeted.height,centerX,centerY,Img.hexTargeted.width,Img.hexTargeted.height);
		}
	}
}

drawHexElements = function(){
	for(var id in hex){
		//Building
		if (hex[id].building !== -1){
			var xOffset = Img.hex.width/2 *0;
			var yOffset = Img.hex.height/2 *0.5;
			var centerX = Math.round(hex[id].x - Img.farm.width/2 - xOffset);
			var centerY = Math.round(hex[id].y - Img.farm.height/2 + yOffset);
			var image = selectImage(hex[id].building);
			ctx.drawImage(image,0,0,image.width,image.height,centerX,centerY,image.width,image.height);
		}

		//Workers
		if (hex[id].workers !== 0){
			var xOffset = Img.hex.width/2 *0.5;
			var yOffset = Img.hex.height/2 *0;
			var centerX = Math.round(hex[id].x - Img.worker.width/2 - xOffset);
			var centerY = Math.round(hex[id].y - Img.worker.height/2 + yOffset);;
			ctx.drawImage(Img.worker,0,0,Img.worker.width,Img.worker.height,centerX,centerY,Img.worker.width,Img.worker.height);

			/*
			//Pouze test!
			var xOffset = Img.hex.width/2 *0;
			var yOffset = Img.hex.height/2 *0.5;
			var centerX = Math.round(hex[id].x - Img.farm.width/2 - xOffset);
			var centerY = Math.round(hex[id].y - Img.farm.height/2 + yOffset);
			ctx.drawImage(Img.farm,0,0,Img.farm.width,Img.farm.height,centerX,centerY,Img.farm.width,Img.farm.height);
			*/
		}

		//Soldiers


		//Mages
	}
}

drawUI = function(){
	for(var key in ui){
		ctx.drawImage(ui[key].image, 0, 0, ui[key].image.width, ui[key].image.height, ui[key].x, ui[key].y, ui[key].image.width, ui[key].image.height);
	}

	//Tlačítka pro propouštění jednotek se zobrazí jenom v případě, že je označena země. Tlačítka pro trénování jednotek se objeví jenom v případě, že je v dané zemi postavena stavba pro výcvik.
	drawHiddenUI();
}

drawHiddenUI = function(){
	for(var key in uiHidden){
		if (showUnitUI === true ){
			//Dismiss
			if (uiHidden[key].id !== 0){
				ctx.drawImage(uiHidden[key].image, 0, 0, uiHidden[key].image.width, uiHidden[key].image.height, uiHidden[key].x, uiHidden[key].y, uiHidden[key].image.width, uiHidden[key].image.height);
			}
			//Train
			else {
				if (checkIfCanTrain(hexSelected)){
					ctx.drawImage(uiHidden[key].image, 0, 0, uiHidden[key].image.width, uiHidden[key].image.height, uiHidden[key].x, uiHidden[key].y, uiHidden[key].image.width, uiHidden[key].image.height);
				}
			}
		}
	}
}

drawBuildingHover = function(){
	var key = mouseUIcolliding;
	if (mouseUIcolliding !== -1)
		if (ui[mouseUIcolliding].name === "building")
			ctx.drawImage(Img.uiBuildingHover, 0, 0, Img.uiBuildingHover.width, Img.uiBuildingHover.height, ui[key].x, ui[key].y, Img.uiBuildingHover.width, Img.uiBuildingHover.height);
}

drawUIbuildings = function(){
	for(var key in ui){
		if (ui[key].name === "building"){
			var image = selectUiImage(key);

			if (image !== undefined){
				var xOffset = 10;		//O kolik bude obrázek posunut doleva od pravého okraje
				var x = ui[key].x + ui[key].image.width - image.width - xOffset;
				var y = ui[key].y + ui[key].image.height/2 - image.height/2;

				ctx.drawImage(image, 0, 0, image.width, image.height, x, y, image.width, image.height);
			}
		}
	}
}

drawTrainingUnits = function(){
	if (showUnitUI === true){
		//Text
		ctx.font="30px Arial";
		ctx.fillStyle = "black";
		ctx.fillText("Train",200,5);
		ctx.fillText("Dismiss",380,5);

		//Images
		var x;
		var y;
		for (i in ui){
			if (ui[i].name === "trainBar"){
				var xBase = ui[i].x;
				var yBase = ui[i].y;
			}
		}
		var xSpace = 40;
		//Train buttons
		/*
		drawButtons(60,55,xBase,yBase,xSpace);

		//Dismiss buttons
		drawButtons(280,40,xBase,yBase,xSpace);
		drawButtons(280,70,xBase,yBase,xSpace);
		*/
	}
}

drawButtons = function(xOffset, yOffset, xBase, yBase, xSpace){
	x = xBase + xOffset;
	y = yBase + yOffset;
	ctx.drawImage(Img.writeButton1, 0, 0, Img.writeButton1.width, Img.writeButton1.height, x, y, Img.writeButton1.width, Img.writeButton1.height);
	x = xBase + xOffset + xSpace + Img.writeButton1.width;
	ctx.drawImage(Img.sendButton1, 0, 0, Img.sendButton1.width, Img.sendButton1.height, x, y, Img.sendButton1.width, Img.sendButton1.height);
}

//Step functions
stepEvent = function(){
	trainUnits();
}

trainUnits = function(){
	if (hexSelected !== -1){
		if (hex[hexSelected].building !== -1){
			showUnitUI = true;
		}
		else {
			showUnitUI = false;
		}
	}
	else {
		showUnitUI = false;
	}
}

//Other functions
findAdjacentHexagons = function(currentHex){
	var adjacentHexagons = []; 	//sem budu zapisovat id hexagonů, které s daným hexagonem sousedí

	for(var id in hex){
		//Přiřadí hexagony z vedlejších sloupců
		if (Math.abs(hex[currentHex].column - hex[id].column) === 1)
			if (Math.abs(hex[currentHex].line - hex[id].line) === 0.5)
				adjacentHexagons.push(id);

		//Přiřadí hexagony ze stejného sloupce
		if (hex[currentHex].column === hex[id].column)
			if (Math.abs(hex[currentHex].line - hex[id].line) === 1)
				adjacentHexagons.push(id);
	}
	//console.log(adjacentHexagons.join(" "));
	return adjacentHexagons;
}

checkIfCanTrain = function(hexSelected){
	for (var i in ui){
		if (ui[i].name === "building")
			break;
			//Vrátí i jako číslo první budovy. Další výcvikové buvody jsou i+1 a i+2.
			//Pozn. - nutno převést i na string
	}
	var i = parseInt(i);
	if ((hex[hexSelected].building >= i) && (hex[hexSelected].building <= i+2))
		return true;
	else
		return false;
}

selectUiImage = function(key){
	var image;
	switch(ui[key].id){
		case 0:
			image = Img.uiFarm;
			break;
		case 1:
			image = Img.uiBarracks;
			break;
		case 2:
			image = Img.uiSchoolOfMagic;
			break;
		case 3:
			image = Img.uiMill;
			break;
		case 4:
			image = Img.uiWell;
			break;
		case 5:
			image = Img.uiTemple;
			break;
		case 6:
			image = Img.uiYellowCrystal;
			break;
		case 7:
			image = Img.uiRedCrystal;
			break;
		case 8:
			image = Img.uiBlueCrystal;
			break;
	}
	return image;
}

selectImage = function(key){
	var image;
	switch(ui[key].id){
		case 0:
			image = Img.farm;
			break;
		case 1:
			image = Img.barracks;
			break;
		case 2:
			image = Img.schoolOfMagic;
			break;
		case 3:
			image = Img.mill;
			break;
		case 4:
			image = Img.well;
			break;
		case 5:
			image = Img.temple;
			break;
		case 6:
			image = Img.yellowCrystal;
			break;
		case 7:
			image = Img.redCrystal;
			break;
		case 8:
			image = Img.blueCrystal;
			break;
	}
	return image;
}

//Update function
update = function(){
	//Create the map
	if (mapCreated === false){
		createMap(columns,mainColumnSize);
		createUI();
	}

	//Check collision
	checkCollision();

	//Step event
	stepEvent();

	//Draw
	drawGame();
}


//Zde nebude žádná funkce - všechny funkce budou až v update(), protože se musí počkat, až se načtou obrázky
setInterval(update,20);
