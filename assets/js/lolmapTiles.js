var LOL_TYLES = function()
{
	var basePath = "assets/img";

	var TILES = [
		new STCJS.Tile( basePath+"/minimap-ig.png", {up: 14980, down: -120, left: -120, right: 14870}, 1 )
	];

	return new STCJS.TilesControl( TILES );
};