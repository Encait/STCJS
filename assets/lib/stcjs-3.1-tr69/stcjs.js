// https://www.youtube.com/watch?v=1eyFAIZrNGo
/**
 * @param stcproperties - object with configuration properties, including:
 * 		div (mandatory) 		dom object where the stc will be set
 *		tiles 			
 *		show_overview: 			true | false (default)
 *		overview_scale: 		0.85 (default)		
 * 		control_camera: 		true(default) | false
 *		control_z_scale: 		true(default) | false
 *		control_zoom: 			true(default) | false
 *		control_semantic_zoom: 	true(default) | false
 *		pov: 					THREE.Vector3(0,0,50)(default)
 *		width
 *		height
 *		show_time_axis_lines: 	true(default) | false
 *		show_time_axis_lables: 	true(default) | false
 *		temporal_unity: 		STCJS.UTILS.TIME_FLAGS.NONE (default)
 *		first_time_label: 		null(default)
 *		format_time_label: 		function( time, time_unit ) 
 *		highlightMapPlane: 		true(default) | false - depricated with new menu options
 *		drawShadows: 			true(default) | false - depricated with new menu options
 *		highlightTimeAxis: 		true(default) | false
 *		timeAxisHighlightStyle: STCJS.LineStyle( { alpha: 1, colour: new THREE.Color(0xff0000), dashed: false } ) (default)
 *		spaceHighlightStyle: 	STCJS.LineStyle( { alpha: 1, colour: new THREE.Color(0xff0000), linewidth: 2, dashed: false } ) (default)
 *		boundingBox: 			{up: _, down: _, left: _, right: _, start: _, end: _}
 */
function STCJS( stcproperties )
{
	// INITIALIZE COMPONENTS :::::::::::::::::::::::::::::::::::::::::::
	var properties = stcproperties;
	this.version = "3.4";
	this.recommended = "ThreeJS r73";
	this.uuid = UTILS.generateUUID();
	var context = this;

	var mouse = new THREE.Vector2(0,0);
	this.camera = null;
	this.scene = null;
	this.renderer = null;
	// --
	var showOverview = ("show_overview" in properties)? properties.show_overview : false;
	this.overviewScale = ("overview_scale" in properties)? properties.overview_scale : 0.85;
	this.camera2 = null;
	// ---
	this.cubeData = {
		// properties
		invertedTime: ("inverted" in properties)? properties["inverted"] : false,
		size : ("size" in properties)? properties["size"] : { x:200, y:200, z:200 },
		currheight : ("size" in properties)? properties["size"].y : 200, 
		startheigth: ("size" in properties)? properties["size"].y : 200,
		maxheigth: ( "max_height" in properties )? properties["max_height"] : 400,
		pos: ( "cube_pos" in properties )? properties["cube_pos"] : {x:0,y:0,z:0},
		map: ( "map" in properties )? properties["map"] : "",
		shadowmap: ( "shadow_map" in properties )? properties["shadow_map"] : "",
		// basic scene objects
		shadowPlaneDown: null,
		shadowPlaneUp: null,
		shadowPlaneH: null,

		mapPlane: null,
		mapPlaneUp: null,
		planeTimeWest: null,
		planeTimeNorth: null,	
		
		baseSpaceLines: null,
		baseSpaceLinesUp: null,
		
		timeAxesInfo: {
			lines: [],
			labels: []
		},
		
		highlights: [],
		spatialHighlights: [],
		temporalHighlights: []
	};

	// ---
	var controls;
	var cube;
	var tileControls = ("tiles" in properties)? properties.tiles : null;
	if( tileControls !== null ) properties.map = tileControls.currentTile.image;
	
	this.stPointsLayers = []; // includes movers and evens
	this.stPeriodLayers = [];
	this.highlightLayers = [];

	var tempTimeHighlight = null;
	var currentHighlightedLayer = null;
	
	var fixedPlaneHighlight = null;	
	var fixedHighlights = [];
	var temporaryHighlights = [];	
	
	var timeHandle;
	var PERIOD = 50;
	var mouseevent = null;
	var mostRecentHighlightEvent;
	
	var bbox = {};
	var isOnContainer = false;
	var updateSTC = false;

	
	// ---
	this.container 			= ("div" in properties)? properties.div : null;
	this.controlCamera 		= ("control_camera" in properties)? properties["control_camera"] : true;
	this.invertedCameraControls = ("inverted_cam_controls" in properties)? properties["inverted_cam_controls"] : false;
	this.forced2D 			= ("forced2D" in properties)? properties["forced2D"] : false;
	this.controlZScale 		= ("control_z_scale" in properties)? properties["control_z_scale"] : true;
	this.controlZoom 		= ("control_zoom" in properties)? properties["control_zoom"] : true;
	this.controlSemZoom 	= ("control_semantic_zoom" in properties)? properties["control_semantic_zoom"] : true;	
	this.pov 				= ("pov" in properties )? properties["pov"] : new THREE.Vector3( 0, 0, 500 );	
	this.width 				= ("width" in properties)? properties["width"]: (this.container !== null)? this.container.clientWidth : null;
	this.height 			= ("height" in properties)? properties["height"]: (this.container !== null)? this.container.clientHeight : null;
		
	this.showTimeAxesLines 		 = ("show_time_axis_lines" in properties)? properties["show_time_axis_lines"] : true;
	this.showTimeAxesLabels 	 = ("show_time_axis_labels" in properties)? properties["show_time_axis_labels"] : true;
	this.temporalUnity 			 = ("temporal_unity" in properties)? properties["temporal_unity"] : STCJS.UTILS.TIME_FLAGS.NONE;
	this.firstTimeLabel 		 = ("first_time_label" in properties)? properties["first_time_label"] : null;
	this.formatTimeLabelFunction = ("format_time_label" in properties)? properties["format_time_label"] : null;
	
	this.highlightMapPlane 		= ("highlightMapPlane" in properties)? properties.highlightMapPlane : true;
	this.drawShadows 			= ("drawShadows" in properties)? properties.drawShadows : false;
	this.drawHotShadows 		= ("heatMap" in properties)? properties.heatMap : false;
	this.visiblePoints 			= [];
	
	this.highlightTimeAxis = ("highlightTimeAxis" in properties)? properties["highlightTimeAxis"] : true;
	this.timeAxisHighlightStyle = ("timeAxisHighlightStyle" in properties)? properties["timeAxisHighlightStyle"] : 
								new STCJS.LineStyle( { alpha: 1, colour: new THREE.Color(0xff0000), dashed: false } );
	this.spaceHighlightStyle = ("spaceHighlightStyle" in properties)? properties["spaceHighlightStyle"]:
								new STCJS.LineStyle( { alpha: 1, colour: new THREE.Color(0xff0000), lineWidth: 5, dashed: false } );

	if( "boundingBox" in properties ) // throw tile controls here somehow
	{
		var checkUp 	= !("up" 	in properties.boundingBox);
		var checkDown 	= !("down" 	in properties.boundingBox);
		var checkLeft 	= !("left" 	in properties.boundingBox);
		var checkRight 	= !("right"	in properties.boundingBox);
		var checkStart 	= !("start" in properties.boundingBox);
		var checkEnd 	= !("end" 	in properties.boundingBox);
		
		// add default values for search
		bbox.up = (checkUp)?  -90: properties.boundingBox.up;
		bbox.down = (checkDown)? 90: properties.boundingBox.down;
		bbox.left = (checkLeft)? 180: properties.boundingBox.left;
		bbox.right = (checkRight)? -180: properties.boundingBox.right;
		bbox.start = (checkStart)? (new Date()).getTime() : properties.boundingBox.start;
		bbox.end = (checkEnd)? (new Date()).getTime() : properties.boundingBox.end;
	}
	else if( tileControls !== null )
	{
		bbox.up = tileControls.currentTile.bbox.up;
		bbox.down = tileControls.currentTile.bbox.down;
		bbox.right = tileControls.currentTile.bbox.right;
		bbox.left = tileControls.currentTile.bbox.left;
		
		bbox.start = (new Date()).getTime();
		bbox.end = (new Date()).getTime();

		//$( "#"+context.uuid+"_mapzoom" ).slider("option", "value", tileControls.currentTile.zoomlevel );
	}

	this.stcUniforms = { 
		color: { type: "c", value: new THREE.Color( 0xffffff ) },
		tfocus: { type: "i", value: false },
		tstart: { type: "i", value: bbox.start },
		tend: { type: "i", value: bbox.end }
	};
	
	timeHandle = window.setInterval( function(e){animate();}, PERIOD);
	$(window).on('resize', function(){ onWindowResize(); } );

	//window.addEventListener( 'resize', onWindowResize, false );

	
	// [STC] FUNCTIONS :::::::::::::::::::::::::::::::::::::::::::::::::
	
	/**
	 * Draws the STC...
	 */
	this.drawSTC = function()
	{
		// create the scene
		this.renderer = new THREE.WebGLRenderer({alpha: true, antialias: true} );
		this.renderer.setSize( this.width, this.height );		
		//this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.autoClear = true;
		
		this.container.appendChild( this.renderer.domElement );
		
		// camera 1 - Main
		this.camera = 
			//new THREE.PerspectiveCamera( 30, this.width / this.height, 1, 1000000 );				
			new THREE.CombinedCamera( this.width/2, this.height/2, 30, 1, 10000, -10000, 10000 );
		this.camera.left = -255;
		this.camera.right = 255;
		this.camera.top = 255;
		this.camera.bottom = -255;
		
		if( this.forced2D )
		{
			this.camera.position.set( 0, this.cubeData.size.z*2, 0 );	
			//this.camera.position.set( 0, this.pov.y, 0 );
			this.camera.lookAt( new THREE.Vector3(0,0,0) );
			this.camera.rotation.z = 0;

			mouseDown = true;
			updateOrthoLens();
			mouseDown = false;
			/*context.camera.toOrthographic();
			var lens = (375*context.cubeData.size.z/context.camera.position.y); //255
			context.camera.setLens( lens );
			if( !mouseDown ) controls.rotateUp( Math.PI/2 );*/
		}
		else
			this.camera.position.set( this.pov.x, this.pov.y, this.pov.z );	

		// camera 2 - Overview - if needed
		if( showOverview )
		{
			this.camera2 = new THREE.OrthographicCamera(
				-255, 255, 255, -255, -1000, 1000 //this last one may be changed?... I guess
			);
			this.camera2.position.set( this.pov.x, 500, this.pov.y);
			this.camera2.lookAt( new THREE.Vector3(0, -10000, 0) );
			this.camera2.rotation.z = 0* (Math.PI / 180);
		}

		// scene
		this.scene = new THREE.Scene();
		this.scene.fog = null;
		// cube
		drawCubeShape();
		if( tileControls !== null ) updateCubeMapTexture( tileControls.currentTile.image );
		
		initializeSTCControls();
		
		this.renderer.domElement.addEventListener('mousedown', function(e){ onMouseDown(e); }, false );
		this.renderer.domElement.addEventListener('mouseup', function(e){ onMouseUp(e); }, false );
		this.renderer.domElement.addEventListener('mousemove', function(e){ onMouseMove(e); }, false );
		this.renderer.domElement.addEventListener('mouseout', function(e){ onMouseOut(e); }, false );
		this.renderer.domElement.addEventListener('dblclick', function(e){ onDoubleClick(e); }, false );
	};

// CUBE DEDICATED FUNCTIONS START

	var drawCubeShape = function()
	{
		var maxAnisotropy = context.renderer.getMaxAnisotropy();
		// 1# Draw planes ::::::::::::::::::::::::::::::::::::::::::::::
		// : map planes :
		var texture = //THREE.ImageUtils.loadTexture( 
			context.cubeData.map;// );
		
		texture.anisotropy = maxAnisotropy;
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.LinearMipMapLinearFilter;

		var mat = ( context.map === "" )? new THREE.MeshBasicMaterial( { color: 0xeeeeee } ) : new THREE.MeshBasicMaterial( {map: texture} );	
		context.cubeData.mapPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), mat);		
		//context.cubeData.mapPlane.overdraw = true;
		context.cubeData.mapPlane.scale.x = context.cubeData.size.x;
		context.cubeData.mapPlane.scale.z = context.cubeData.size.y;
		context.cubeData.mapPlane.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); // rotate the plane
		context.cubeData.mapPlane.position.set( context.cubeData.pos.x, context.cubeData.pos.z-context.cubeData.size.z/2-0.1, context.cubeData.pos.y );
		context.cubeData.mapPlane.name = "mapPlane";
		context.scene.add(context.cubeData.mapPlane);

		var mat2 = mat.clone();
		context.cubeData.mapPlaneUp = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), mat2);		
		context.cubeData.mapPlaneUp.overdraw = true;
		context.cubeData.mapPlaneUp.scale.x = context.cubeData.size.x;
		context.cubeData.mapPlaneUp.scale.z = context.cubeData.size.y;
		context.cubeData.mapPlaneUp.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); // rotate the plane
		context.cubeData.mapPlaneUp.name = "mapPlaneUp";
		context.cubeData.mapPlaneUp.material.needsUpdate = true;
		context.cubeData.mapPlaneUp.material.side = THREE.BackSide;
		context.cubeData.mapPlaneUp.position.set( context.cubeData.pos.x, context.cubeData.pos.z+context.cubeData.size.z/2, context.cubeData.pos.y );
		context.scene.add( context.cubeData.mapPlaneUp );	

		var shadowMapMat = new THREE.MeshBasicMaterial({transparent: true, opacity: 0} );
		context.cubeData.shadowPlaneDown = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), shadowMapMat );
		context.cubeData.shadowPlaneDown.overdraw = true;
		context.cubeData.shadowPlaneDown.scale.x = context.cubeData.size.x;
		context.cubeData.shadowPlaneDown.scale.z = context.cubeData.size.y;
		context.cubeData.shadowPlaneDown.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); // rotate the plane
		context.cubeData.shadowPlaneDown.position.set(context.cubeData.pos.x, context.cubeData.pos.z-context.cubeData.size.z/2 + 0.1, context.cubeData.pos.y );
		context.cubeData.shadowPlaneDown.name = "mapPlaneShadowDown";
		context.scene.add(context.cubeData.shadowPlaneDown);

		context.cubeData.shadowPlaneUp = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), shadowMapMat.clone() );		
		context.cubeData.shadowPlaneUp.overdraw = true;
		context.cubeData.shadowPlaneUp.scale.x = context.cubeData.size.x;
		context.cubeData.shadowPlaneUp.scale.z = context.cubeData.size.y;
		context.cubeData.shadowPlaneUp.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); // rotate the plane
		context.cubeData.shadowPlaneUp.name = "mapPlaneShadowUp";
		context.cubeData.shadowPlaneUp.material.needsUpdate = true;
		context.cubeData.shadowPlaneUp.material.side = THREE.BackSide;
		context.cubeData.shadowPlaneUp.position.set( context.cubeData.pos.x, context.cubeData.pos.z+context.cubeData.size.z/2 - 0.1, context.cubeData.pos.y );
		context.scene.add( context.cubeData.shadowPlaneUp );

		// : temporal planes :
		context.cubeData.planeTimeNorth = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), new THREE.MeshBasicMaterial({color: 0xeeeeee }));
		context.cubeData.planeTimeNorth.overdraw = true;
		context.cubeData.planeTimeNorth.position.set( context.cubeData.pos.x, context.cubeData.pos.z, context.cubeData.pos.y-context.cubeData.size.y/2-1 );
		context.cubeData.planeTimeNorth.scale.x = context.cubeData.size.x;
		context.cubeData.planeTimeNorth.scale.y = context.cubeData.size.z;
		context.cubeData.planeTimeNorth.name = "planeTimeNorth";
		//planeTime1.scale.z = context.cubeSize.z;
		context.scene.add(context.cubeData.planeTimeNorth);

		context.cubeData.planeTimeWest = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), 
			new THREE.MeshBasicMaterial({color: 0xeeeeee }));//new THREE.MeshNormalMaterial());
		context.cubeData.planeTimeWest.overdraw = true;		
		context.cubeData.planeTimeWest.scale.x = context.cubeData.size.x;
		context.cubeData.planeTimeWest.scale.y = context.cubeData.size.z;
		context.cubeData.planeTimeWest.scale.z = context.cubeData.size.y;
		context.cubeData.planeTimeWest.geometry.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI / 2 ) ); // rotate the plane
		context.cubeData.planeTimeWest.position.set(context.cubeData.pos.x - context.cubeData.size.x/2 -1, context.cubeData.pos.z, context.cubeData.pos.y );
		context.cubeData.planeTimeWest.name = "planeTimeWest";
		context.scene.add(context.cubeData.planeTimeWest);

		// #2 Draw lines ::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
		context.cubeData.baseSpaceLines = new THREE.Line( new THREE.Geometry(), 
			new THREE.LineBasicMaterial( {opacity: 1, color: 0x000000, linewidth: 1} ));
		context.cubeData.baseSpaceLines.geometry.vertices.push( new THREE.Vector3( (context.cubeData.pos.x - context.cubeData.size.x/2)+.1, (context.cubeData.pos.z - context.cubeData.size.z/2), (context.cubeData.pos.y - context.cubeData.size.y/2)+.1 ));
		context.cubeData.baseSpaceLines.geometry.vertices.push( new THREE.Vector3( (context.cubeData.pos.x - context.cubeData.size.x/2)+.1, (context.cubeData.pos.z - context.cubeData.size.z/2), (context.cubeData.pos.y + context.cubeData.size.y/2)+.1 ));
		context.cubeData.baseSpaceLines.geometry.vertices.push( new THREE.Vector3( (context.cubeData.pos.x + context.cubeData.size.x/2)+.1, (context.cubeData.pos.z - context.cubeData.size.z/2), (context.cubeData.pos.y + context.cubeData.size.y/2)+.1 ));
		context.cubeData.baseSpaceLines.geometry.vertices.push( new THREE.Vector3( (context.cubeData.pos.x + context.cubeData.size.x/2)+.1, (context.cubeData.pos.z - context.cubeData.size.z/2), (context.cubeData.pos.y - context.cubeData.size.y/2)+.1 ));
		context.cubeData.baseSpaceLines.geometry.vertices.push( new THREE.Vector3( (context.cubeData.pos.x - context.cubeData.size.x/2)+.1, (context.cubeData.pos.z - context.cubeData.size.z/2), (context.cubeData.pos.y - context.cubeData.size.y/2)+.1 ));
		context.cubeData.baseSpaceLines.name = "baseSpaceLines";
		context.scene.add( context.cubeData.baseSpaceLines );

		render();
	};
	
	var updateCubeMapTexture = function( texture ){
		texture.anisotropy = context.renderer.getMaxAnisotropy();
		texture.magFilter = THREE.NearestFilter;
		texture.minFilter = THREE.LinearMipMapLinearFilter;

		context.cubeData.map = texture;
		context.cubeData.mapPlane.material.map = texture;
		context.cubeData.mapPlane.material.needsUpdate = true;				
		
		context.cubeData.mapPlaneUp.material.map = texture;
		context.cubeData.mapPlaneUp.material.needsUpdate = true;
		
		for( var ii = 0; ii < context.cubeData.highlights.length; ii++ )
		{					
			for( var j = 0; j < context.cubeData.highlights[ii].inScene.length; j++ )
			{
				var feature = context.cubeData.highlights[ii].inScene[j];
				if( feature.name === "mapPlaneHighlight" )
				{
					feature.material.map = texture;
					feature.material.needsUpdate = true;
				}						
			}
		}
		render();
	};

	this.forceUpdateTimeAxesLocation = function()
	{
		updateTimeAxesLocation();
	};

	// ---
	var updateTimeAxesLocation = function()
	{
		var invisLine = new THREE.LineBasicMaterial( {opacity: 0, transparent: true, color: 0x000000, linewidth: 1} );
		var visLine = new THREE.LineBasicMaterial( {opacity: 1, transparent: true, color: 0x000000, linewidth: 1} );
		
		var lastVisible = 0;
		var stcElemPos = UTILS.findObjectPosition( context.container );		
		var area = new Array( stcElemPos[0], stcElemPos[1], stcElemPos[0]+context.container.offsetWidth, stcElemPos[1]+context.container.offsetHeight ); 
		
		// here to use base point
		var basePoints = [
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y+context.cubeData.size.z/2+0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y+0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y-context.cubeData.size.z/2-0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y-context.cubeData.size.z/2-0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y-context.cubeData.size.z/2-0.05*context.cubeData.size.z/2 }
		];
		
		var bpi = 0;
		var found = false;
		var point2D;
		while( bpi < basePoints.length && !found )
		{
			point2D = context.stcTo2Dpoint(basePoints[bpi].x, basePoints[bpi].y, basePoints[bpi].z );
			found = UTILS.contains( new Array( point2D.x, point2D.y), area );
			if( !found ) bpi ++;
		}
		bpi = (found)? bpi : 2;
		point2D = context.stcTo2Dpoint( basePoints[bpi].x, basePoints[bpi].y, basePoints[bpi].z );
		
		for( var i = 0; i < context.cubeData.timeAxesInfo.lines.length; i++ )
		{
			var time = context.cubeData.timeAxesInfo.lines[i].currentRepresentedTime;
			var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
					
			context.cubeData.timeAxesInfo.lines[i].geometry.vertices[0].y = ytime;
			context.cubeData.timeAxesInfo.lines[i].geometry.vertices[1].y = ytime;
			context.cubeData.timeAxesInfo.lines[i].geometry.vertices[2].y = ytime;
			context.cubeData.timeAxesInfo.lines[i].geometry.verticesNeedUpdate = true;
			
			point2D = context.stcTo2Dpoint( basePoints[bpi].x, ytime, basePoints[bpi].z );
			
			// change context.cubeData.timeAxesInfo.labels to getElementbyID....???
			if( UTILS.contains( new Array(point2D.x, point2D.y), area) )
			{
				context.cubeData.timeAxesInfo.labels[i].style.left = point2D.x-context.cubeData.timeAxesInfo.labels[i].offsetWidth/2 + "px";
				context.cubeData.timeAxesInfo.labels[i].style.top = point2D.y-context.cubeData.timeAxesInfo.labels[i].offsetHeight/2 + "px";
				context.cubeData.timeAxesInfo.labels[i].style.zIndex = 0;
				var lname = context.cubeData.timeAxesInfo.labels[i].getAttribute("name");
				
				var overlap = false;
				if( i >= 1 && i < context.cubeData.timeAxesInfo.lines.length-1 )
				{					
					var thisLabelPos, otherLabelPos;
					if( i !== context.cubeData.timeAxesInfo.lines.length-2 )
					{
						thisLabelPos = UTILS.findObjectPosition( context.cubeData.timeAxesInfo.labels[i] );
						otherLabelPos = UTILS.findObjectPosition( context.cubeData.timeAxesInfo.labels[lastVisible] );
						overlap = thisLabelPos[1]+context.cubeData.timeAxesInfo.labels[i].offsetHeight > otherLabelPos[1];
						overlap = overlap && context.cubeData.timeAxesInfo.labels[lastVisible].style.visibility !== "hidden"; 
					}
					else
					{						
						thisLabelPos = UTILS.findObjectPosition( context.cubeData.timeAxesInfo.labels[i+1] );
						otherLabelPos = UTILS.findObjectPosition( context.cubeData.timeAxesInfo.labels[i] );
						overlap = thisLabelPos[1]+context.cubeData.timeAxesInfo.labels[i+1].offsetHeight > otherLabelPos[1];
						overlap = overlap && context.cubeData.timeAxesInfo.labels[i+1].style.visibility !== "hidden";
					}		
					
					if( !overlap )
					{
						lastVisible = i;
						context.cubeData.timeAxesInfo.lines[i].material = visLine;
					}
					else
					{
						context.cubeData.timeAxesInfo.lines[i].material = invisLine;
					}							
				}
								
				for( var ii = 0; ii < context.cubeData.highlights.length && !overlap; ii++ )
				{					
					for( var j = 0; j < context.cubeData.highlights[ii].inScene.length && !overlap; j++ )
					{
						var feature = context.cubeData.highlights[ii].inScene[j];
						if( feature.name === "mapPlaneHighlight" )
						{
							var time = feature.currentRepresentedTime;
							var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
							
							var p1 = context.stcTo2Dpoint( context.cubeData.pos.x-context.cubeData.size.x/2, ytime, context.cubeData.pos.y-context.cubeData.size.z/2 );
							var p2 = context.stcTo2Dpoint( context.cubeData.pos.x-context.cubeData.size.x/2, ytime, context.cubeData.pos.y+context.cubeData.size.z/2 );
							var p3 = context.stcTo2Dpoint( context.cubeData.pos.x+context.cubeData.size.x/2, ytime, context.cubeData.pos.y-context.cubeData.size.z/2 );
							var p4 = context.stcTo2Dpoint( context.cubeData.pos.x+context.cubeData.size.x/2, ytime, context.cubeData.pos.y+context.cubeData.size.z/2 );
							
							if( UTILS.isPointInPoly( new Array(p1, p2, p3, p4), point2D ) )
								overlap = true;
						}						
					}
				}
								
				if( overlap || context.camera.inOrthographicMode ) 
					context.cubeData.timeAxesInfo.labels[i].style.visibility = "hidden";
				else
					context.cubeData.timeAxesInfo.labels[i].style.visibility = ( lname != "stcTimeLabel" || (context.showTimeAxesLabels && lname == "stcTimeLabel") )? "visible" : "hidden";
			}
			else
			{
				context.cubeData.timeAxesInfo.labels[i].style.left = "0px";
				context.cubeData.timeAxesInfo.labels[i].style.top =	"0px";			
				context.cubeData.timeAxesInfo.labels[i].style.zIndex = -1;
				context.cubeData.timeAxesInfo.labels[i].style.visibility = "hidden";
				context.cubeData.timeAxesInfo.lines[i].material = visLine;
			}			
		}

		updateSpatialHighlightsPositions();
		//updateCubeDataHighlightsPositions();	
		
		for( var i = 0; i < context.cubeData.highlights.length; i++ )
		{
			for( var j = 0; j < context.cubeData.highlights[i].inScene.length; j++ )
			{
				var feature = context.cubeData.highlights[i].inScene[j];
				if( feature instanceof THREE.Line ) // lines
				{
					var time = context.cubeData.highlights[i].inScene[j].currentRepresentedTime;
					var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
					
					for( var a = 0; a < feature.geometry.vertices.length; a++ )	
						feature.geometry.vertices[a].y = ytime;
					
					feature.geometry.verticesNeedUpdate = true;
				}
				else if( feature.name === "mapPlaneHighlight" || feature.name === "mapPlaneHighlightShadow" )
				{					
					var time = feature.currentRepresentedTime;
					var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
					feature.position.y = ytime + ((feature.name === "mapPlaneHighlightShadow")? 0.1 : 0);
					feature.verticesNeedUpdate = true;
				}
				else if( feature.geometry instanceof THREE.PlaneBufferGeometry ) // other planes?
				{
					var time1 = feature.startTime;
					var yPos1 = context.stpoint2stc( new STPoint(0,0,0, time1) ).y;
					
					var time2 = feature.endTime;
					var yPos2 = context.stpoint2stc( new STPoint(0,0,0, time2) ).y;
					
					feature.scale.y =  yPos2-yPos1;
					feature.position.y = yPos1+(yPos2-yPos1)/2;										
				}
				else if( feature.geometry instanceof THREE.CylinderGeometry )
				{
					var newSize = Math.abs( context.stpoint2stc( feature.hPoint ).y - (context.cubeData.pos.z-context.cubeData.size.z/2) );
					
					feature.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + newSize/2;					
					feature.scale.y = newSize;
					feature.geometry.verticesNeedUpdate = true;								
				}		
			}
			
			for( var j = 0; j < context.cubeData.highlights[i].inDom.length; j++ )
			{
				var time = context.cubeData.highlights[i].inDom[j].currentRepresentedTime;
				var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
				//var point2D = context.stcTo2Dpoint(context.cubeData.pos.x-context.cubeData.size.x/2, ytime, context.cubeData.pos.z+context.cubeData.size.z/2+0.05*context.cubeData.size.z/2 );
				point2D = context.stcTo2Dpoint( basePoints[bpi].x, ytime, basePoints[bpi].z );
			
				// change context.cubeData.timeAxesInfo.labels to getElementbyID....???
				if( UTILS.contains( new Array(point2D.x, point2D.y), area) )
				{
					context.cubeData.highlights[i].inDom[j].style.left = point2D.x-context.cubeData.highlights[i].inDom[j].offsetWidth/2 + "px";
					context.cubeData.highlights[i].inDom[j].style.top = point2D.y-context.cubeData.highlights[i].inDom[j].offsetHeight/2 + "px";
					context.cubeData.highlights[i].inDom[j].style.zIndex = 1;
					var lname = context.cubeData.highlights[i].inDom[j].getAttribute("name");
					
					context.cubeData.highlights[i].inDom[j].style.visibility = "visible";
				}
				else
				{					
					context.cubeData.highlights[i].inDom[j].style.zIndex = -1;
					context.cubeData.highlights[i].inDom[j].style.visibility = "hidden";
					context.cubeData.highlights[i].inDom[j].style.left = "0px";
					context.cubeData.highlights[i].inDom[j].style.top =	"0px";				
				}				
			}				
		}

	};

	var updateSpatialHighlightsPositions = function()
	{
		for( var i = 0; i < context.cubeData.spatialHighlights.length; i++ )
		{
			for( var j = 0; j < context.cubeData.spatialHighlights[i].inScene.length; j++ )
			{
				var feature = context.cubeData.spatialHighlights[i].inScene[j];
				if( feature.geometry instanceof THREE.CylinderGeometry )
				{
					var newPos = context.stpoint2stc( feature.hPoint );
					var newSize = Math.abs( newPos.y - (context.cubeData.pos.z-context.cubeData.size.z/2) );
					
					feature.position.x = newPos.x;
					feature.position.z = newPos.z;
					feature.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + newSize/2;					
					feature.scale.y = newSize+1;
					feature.geometry.verticesNeedUpdate = true;								
				}
				else if( feature instanceof THREE.Line )
				{
					var hlineVertices = feature.geometry.vertices;
					var vertexBB = getVertexBBox( context.cubeData.spatialHighlights[i].startPoint, context.cubeData.spatialHighlights[i].endPoint );
					var newBB = [
						vertexBB[0], vertexBB[1], vertexBB[2], vertexBB[3], vertexBB[0],
						vertexBB[4], vertexBB[5], vertexBB[6], vertexBB[7], vertexBB[4],
						vertexBB[5], vertexBB[1], vertexBB[2], vertexBB[6], vertexBB[7], vertexBB[3] 
					];
					for( var j = 0; j < hlineVertices.length; j++ )
						hlineVertices[j] = newBB[j];
					
					feature.geometry.verticesNeedUpdate = true;
				}
			}
		}
	};

	// not used yet ...
	var updateCubeDataHighlightsPositions = function()
	{
		// 
		var basePoints = [
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y+context.cubeData.size.z/2+0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y+0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y-context.cubeData.size.z/2-0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y-context.cubeData.size.z/2-0.05*context.cubeData.size.z/2 },
			{ x: context.cubeData.pos.x-context.cubeData.size.x/2, y: context.cubeData.pos.z-context.cubeData.size.z/2, z: context.cubeData.pos.y-context.cubeData.size.z/2-0.05*context.cubeData.size.z/2 }
		];

		for( var i = 0; i < context.cubeData.highlights.length; i++ )
		{
			for( var j = 0; j < context.cubeData.highlights[i].inScene.length; j++ )
			{
				var feature = context.cubeData.highlights[i].inScene[j];
				if( feature instanceof THREE.Line ) // lines
				{
					var time = context.cubeData.highlights[i].inScene[j].currentRepresentedTime;
					var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
					
					for( var a = 0; a < feature.geometry.vertices.length; a++ )	
						feature.geometry.vertices[a].y = ytime;
					
					feature.geometry.verticesNeedUpdate = true;
				}
				else if( feature.name === "mapPlaneHighlight" || feature.name === "mapPlaneHighlightShadow" )
				{					
					var time = feature.currentRepresentedTime;
					var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
					feature.position.y = ytime + ((feature.name === "mapPlaneHighlightShadow")? 0.1 : 0);
					feature.verticesNeedUpdate = true;
				}
				else if( feature.geometry instanceof THREE.PlaneBufferGeometry ) // other planes?
				{
					var time1 = feature.startTime;
					var yPos1 = context.stpoint2stc( new STPoint(0,0,0, time1) ).y;
					
					var time2 = feature.endTime;
					var yPos2 = context.stpoint2stc( new STPoint(0,0,0, time2) ).y;
					
					feature.scale.y =  yPos2-yPos1;
					feature.position.y = yPos1+(yPos2-yPos1)/2;										
				}
				else if( feature.geometry instanceof THREE.CylinderGeometry )
				{
					var newSize = Math.abs( context.stpoint2stc( feature.hPoint ).y - (context.cubeData.pos.z-context.cubeData.size.z/2) );
					
					feature.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + newSize/2;					
					feature.scale.y = newSize;
					feature.geometry.verticesNeedUpdate = true;								
				}		
			}
			
			for( var j = 0; j < context.cubeData.highlights[i].inDom.length; j++ )
			{
				var time = context.cubeData.highlights[i].inDom[j].currentRepresentedTime;
				var ytime = context.stpoint2stc( new STPoint(0,0,0, time) ).y;
				//var point2D = context.stcTo2Dpoint(context.cubeData.pos.x-context.cubeData.size.x/2, ytime, context.cubeData.pos.z+context.cubeData.size.z/2+0.05*context.cubeData.size.z/2 );
				point2D = context.stcTo2Dpoint( basePoints[bpi].x, ytime, basePoints[bpi].z );
			
				// change context.cubeData.timeAxesInfo.labels to getElementbyID....???
				if( UTILS.contains( new Array(point2D.x, point2D.y), area) )
				{
					context.cubeData.highlights[i].inDom[j].style.left = point2D.x-context.cubeData.highlights[i].inDom[j].offsetWidth/2 + "px";
					context.cubeData.highlights[i].inDom[j].style.top = point2D.y-context.cubeData.highlights[i].inDom[j].offsetHeight/2 + "px";
					context.cubeData.highlights[i].inDom[j].style.zIndex = 1;
					var lname = context.cubeData.highlights[i].inDom[j].getAttribute("name");
					
					context.cubeData.highlights[i].inDom[j].style.visibility = "visible";
				}
				else
				{					
					context.cubeData.highlights[i].inDom[j].style.zIndex = -1;
					context.cubeData.highlights[i].inDom[j].style.visibility = "hidden";
					context.cubeData.highlights[i].inDom[j].style.left = "0px";
					context.cubeData.highlights[i].inDom[j].style.top =	"0px";				
				}				
			}				
		}
	};

	var getVertexBBox = function( startPoint, endPoint )
	{
		var p1, p2, p3, p4, p5, p6, p7, p8;
		p1 = context.stpoint2stc( startPoint );
		p1.refPoint = startPoint;
		p1.y = context.cubeData.mapPlane.position.y +0.5;

		p2 = context.stpoint2stc( new STPoint( endPoint.latitude, startPoint.longitude, 0, startPoint.timestamp ) );
		p2.refPoint = new STPoint( endPoint.latitude, startPoint.longitude, 0, startPoint.timestamp );
		p2.y = context.cubeData.mapPlane.position.y +0.5;

		p3 = context.stpoint2stc( endPoint );
		p3.refPoint = endPoint;
		p3.y = context.cubeData.mapPlane.position.y +0.5;

		p4 = context.stpoint2stc( new STPoint( startPoint.latitude, endPoint.longitude, 0, startPoint.timestamp ) );
		p4.refPoint = new STPoint( startPoint.latitude, endPoint.longitude, 0, startPoint.timestamp );
		p4.y = context.cubeData.mapPlane.position.y +0.5;

		p5 = p1.clone(); 
		p5.y = context.cubeData.mapPlaneUp.position.y;
		p5.refPoint = p1.refPoint;

		p6 = p2.clone(); 
		p6.y = context.cubeData.mapPlaneUp.position.y;
		p6.refPoint = p2.refPoint;

		p7 = p3.clone(); 
		p7.y = context.cubeData.mapPlaneUp.position.y;
		p7.refPoint = p3.refPoint;

		p8 = p4.clone();
		p8.y = context.cubeData.mapPlaneUp.position.y;
		p8.refPoint = p4.refPoint;

		return [ p1, p2, p3, p4, p5, p6, p7, p8 ];
	};
	// ***

// CUBE DEDICATED FUNCTIONS END
	
	var onWindowResize = function()
	{
		context.width = ("width" in properties)? properties["width"]: (context.container !== null)? context.container.clientWidth : null;
		context.height = ("height" in properties)? properties["height"]: (context.container !== null)? context.container.clientHeight : null;
		context.renderer.setSize( context.width, context.height );
		context.camera.cameraP.aspect = context.width / context.height;
		context.camera.updateProjectionMatrix();
		context.renderer.render( context.scene, context.camera );

		var div = document.getElementById( context.uuid+":stcControls1" );
		div.style.left = ( (context.container.offsetLeft + context.width) - 105 )+"px"; //(context.container.offsetLeft+5)+"px";
		div.style.top = (context.container.offsetTop+5)+"px";

		(document.getElementById(context.uuid+"_stcControls1_core_menu")).style.maxHeight = (context.height*0.9)+"px";

		updateTimeAxesLocation();	
	};

	/*
	 * 
	 */
	var render = function()
	{	
		context.renderer.sortObjects = false;
		context.renderer.clear();
		context.renderer.setViewport( 0, 0, context.width, context.height );
		context.renderer.render( context.scene, context.camera );
		
		if( showOverview )
		{					
			context.renderer.setViewport( 
				context.width-context.overviewScale*context.height,			
				0, 
				context.overviewScale*context.height, 
				context.overviewScale*context.height );				
			context.renderer.render( context.scene, context.camera2 );
		}
	};

	this.cameraControls;
	this.resetView = function()
	{
		this.camera.position.set( this.pov.x, this.pov.y, this.pov.z );
		this.camera.lookAt( new THREE.Vector3( 0, 0, 0 ) );
		
		controls.enabled = false;
		controls = new THREE.OrbitControls( this.camera );		
		this.cameraControls = controls;
		if( context.controlCamera )
		{
			controls.enabled = false;
			controls.addEventListener( 'change', render );
			controls.bindToContainer( context.container );
		}
		controls.bindToContainerWithException( context.container, document.getElementById(context.uuid+":stcControls") );
		render();
	};
	
	/**
	 * Initializes the various controls: zoom, orbit/camera controls, cube resize, shadow drawing and highlight selection, ect...
	 */
	var initializeSTCControls = function()
	{		
		controls = new THREE.OrbitControls( context.camera );
		context.cameraControls = controls;
		controls.enabled = false;
		if( context.controlCamera )
		{
			controls.forced2D = context.forced2D;
			if( context.forced2D )
				resizeSTCHeight( 0 );
			controls.invertedControls = context.invertedCameraControls;
			//controls.enabled = false;
			controls.addEventListener( 'change', render );
			controls.bindToContainer( context.container );

		}
		
		if( context.controlZScale || context.controlZoom || context.controlSemZoom )
		{
			var divPos = UTILS.findObjectPosition( context.container );
			var div = document.createElement("div");
			context.container.appendChild( div );
			
			div.setAttribute("id", context.uuid+":stcControls1");
			div.setAttribute("name", "stcControls1");
			div.style.zIndex = 1;
			div.style.position = 'absolute';			
			div.style.left = ( (context.container.offsetLeft + context.width) - 105 )+"px"; //(context.container.offsetLeft+5)+"px";
			div.style.top = (context.container.offsetTop+5)+"px";
			div.style.backgroundColor = "white";
			div.style.fontSize = "0.8em";
			//div.style.height = context.height;
			div.innerHTML = 
				"<div style='border:1px solid black;width:100px;'>"+
					"<button id='"+context.uuid+"_stcControls1_show_hide' class='stcControlMenuOpenIcon' style='width:100%'>Hide</button><br>"+
					"<div id='"+context.uuid+"_stcControls1_core_menu' style='float:left;max-height:"+(context.height*0.9)+"px;width:100px;text-align:center;border:1px solid black; overflow:auto'>"+ //
						"<div id='"+context	.uuid+"_stcControls1_zoomView' style='height:10%'>"+
							"Zoom view:<br>"+
							"<button id='"+context.uuid+"_stcControls1_zoomView_in'>zoom in</button>"+
							"<button id='"+context.uuid+"_stcControls1_zoomView_out'>zoom out</button>"+
						"</div>"+
						"<hr>"+
						"Resize stc:<br>"+
						"<div style='height: 90px;text-align:center;margin-right:10%;margin-left:10%'>"+
							"<div style='float:left'>"+
								"<button id='"+context.uuid+"_stcControls1_zoomstc_in'>zoom in</button><br>"+
								"<button id='"+context.uuid+"_stcControls1_zoomstc_def'>default</button><br>"+						
								"<button id='"+context.uuid+"_stcControls1_zoomstc_out'>zoom out</button>"+
							"</div>"+
							"<div style='float:right;height:80px'>"+
								"<div id='"+context.uuid+"_stcControls1_zoomstc' style='height:100%;margin:0 auto'></div>"+
							"</div>"+
						"</div>"+
						"<hr>"+
						"Map Pan:<br>"+
						"<div style='text-align:center'> <Button id='"+context.uuid+"_mappanup'>pan up</button></div>"+
						"<Button id='"+context.uuid+"_mappanleft'>pan left</button>"+
						"<Button id='"+context.uuid+"_mappanright'>pan right</button>"+
						"<div style='text-align:center'> <Button id='"+context.uuid+"_mappandown'>pan down</button></div>"+
						"<hr>"+
						"Map Zoom:<br>"+
						"<div style='height:90px;text-align:center;margin-right:10%;margin-left:10%'>"+
							"<div style='float:right;height:80px'>"+
								"<div id='"+context	.uuid+"_mapzoom' style='height:100%;margin:0 auto'></div>"+
							"</div>"+
							"<div style='float:left;height:100%'>"+
								"<button id='"+context.uuid+"_mapzoom_in'>zoom in</button><br>"+
								"<br>"+ //"<button id='"+context.uuid+"_mapzoom_fit'>fit</button><br>"+
								"<button id='"+context.uuid+"_mapzoom_out'>zoom out</button>"+
							"</div>"+
						"</div>"+
						"<hr>"+
						"Extra Plane: <input type='checkbox' id='"+context.uuid+"_extra_plane' checked />"+
						"<hr>"+
						"Shadows:"+
						"<select id='"+context.uuid+"_select_shadows'>"+
							"<option value='none'>none</option>"+
							"<option value='shadows'>shadows</option>"+
							"<option value='heatmap'>heatmap</option>"+
						"</select>"+
						"<hr>"+
						"Select space:"+
						"<select id='"+context.uuid+"_select_space'>"+
							"<option value='point'>point</option>"+
							"<option value='area'>area</option>"+
						"</select>"+
					"</div>"+
				"</div>";	
			div.className += " stcControls";		
			
			$(".stcControlMenuOpenIcon").button({
			    icons: {
			        primary: "ui-icon-carat-1-n"
			    }
			});

			$( "#"+context.uuid+"_stcControls1_show_hide" ).button({
				text: true,
				icons: { primary: "ui-icon-carat-1-n" }
			}).click( function(){
				if( $(this).data('state') == 'stcControlMenuOpen' )
				{
					$("#"+context.uuid+"_stcControls1_core_menu").hide();
					//$(this).text("Show");
				}
				else
				{
					$("#"+context.uuid+"_stcControls1_core_menu").show();	
					//$(this).text("Hide");
				}
				
				$(this).data('state', ($(this).data('state') == 'stcControlMenuOpen') ? 'stcControlMenuClose' : 'stcControlMenuOpen');
			    $(".stcControlMenuOpenIcon").button({
			    	label: ($(this).data('state') == "stcControlMenuOpen") ?
			        		"Hide" : "Show", 
			        icons: {
			            primary: ($(this).data('state') == "stcControlMenuOpen") ?
			            	"ui-icon-carat-1-n" : "ui-icon-carat-1-s"
			        }
			    });
			});

			$("#"+context.uuid+"_stcControls1_show_hide").data('state', 'stcControlMenuOpen' ); // at the start of the application

			$( "#"+context.uuid+"_stcControls1_zoomView_in" ).button({
				text: false,
				icons: { primary: "ui-icon-zoomin" }
			}).click( function(){
				for( var i = 0; i < 10; i++ ) controls.zoomIn(); 
				controls.update();
				updateTimeAxesLocation();
				if( context.camera.inOrthographicMode ) updateOrthoLens();
			});
			$( "#"+context.uuid+"_stcControls1_zoomView_out" ).button({
				text: false,
				icons: { primary: "ui-icon-zoomout" }
			}).click( function(){
				for( var i = 0; i < 10; i++ ) controls.zoomOut(); 
				controls.update();
				updateTimeAxesLocation();
				if( context.camera.inOrthographicMode ) updateOrthoLens();
			});
			
			$( "#"+context.uuid+"_stcControls1_zoomstc_in" ).button({
				text: false,
				icons: { primary: "ui-icon-plus" }
			}).mousedown( function(){
				context.cubeData.currheight = (context.cubeData.currheight + 10 < context.cubeData.size.z*2)? context.cubeData.currheight + 10 : context.cubeData.size.z*2;
				resizeSTC( context.cubeData.currheight );
				$( "#"+context.uuid+"_stcControls1_zoomstc" ).slider( "value", context.cubeData.currheight );
			});
			
			$( "#"+context.uuid+"_stcControls1_zoomstc_out" ).button({
				text: false,
				icons: { primary: "ui-icon-minus" }
			}).mousedown(function(){
				context.cubeData.currheight = (context.cubeData.currheight - 10 > 1)? context.cubeData.currheight - 10 : 1;
				resizeSTC( context.cubeData.currheight );
				$( "#"+context.uuid+"_stcControls1_zoomstc" ).slider( "value", context.cubeData.currheight );
			});
			
			$("#"+context.uuid+"_stcControls1_zoomstc_def").button({
				text: false,
				icons: { primary: "ui-icon-radio-off" }
			}).click( function(){
				context.cubeData.currheight = context.cubeData.size.z;
				resizeSTC( context.cubeData.currheight );
				$( "#"+context.uuid+"_stcControls1_zoomstc" ).slider( "value", context.cubeData.currheight );
			});
			
			$( "#"+context.uuid+"_stcControls1_zoomstc" ).slider({
				orientation: "vertical",
				range: "min",
				min: 1,
				max: (context.cubeData.size.z*2),
				value: (context.cubeData.size.z),
				slide: 
				function( event, ui ) {
					resizeSTC( ui.value );
					context.cubeData.currheight = ui.value;
				}
			});
			
			$( "#"+context.uuid+"_mappanup" ).button({
				text: false,
				icons: { primary: "ui-icon-circle-triangle-n" }
			}).click( function(){ panSTCMap(DIR.NORTH); });
			
			$( "#"+context.uuid+"_mappandown" ).button({
				text: false,
				icons: { primary: "ui-icon-circle-triangle-s" }
			}).click( function(){ panSTCMap(DIR.SOUTH); });
			
			$( "#"+context.uuid+"_mappanleft" ).button({
				text: false,
				icons: { primary: "ui-icon-circle-triangle-w" }
			}).click( function(){ panSTCMap(DIR.WEST); });
			
			$( "#"+context.uuid+"_mappanright" ).button({
				text: false,
				icons: { primary: "ui-icon-circle-triangle-e" }
			}).click( function(){ panSTCMap(DIR.EAST); });
			
			$( "#"+context.uuid+"_mapzoom_in" ).button({
				text: false,
				icons: { primary: "ui-icon-plus" }
			}).click( function(){ zoomSTC(1); });
			
			$( "#"+context.uuid+"_mapzoom_out" ).button({
				text: false,
				icons: { primary: "ui-icon-minus" }
			}).click( function(){ zoomSTC(-1); });
			
			$( "#"+context.uuid+"_mapzoom" ).slider({
				orientation: "vertical",
				range: "min",
				min: (tileControls !== null)? tileControls.minZoom : 1,
				max: (tileControls !== null)? tileControls.maxZoom : 1,
				value: 1,
				//stop:
				slide: 
				function( event, ui ) {
					setSTCZoom( ui.value );
				}
			});
			
			$( "#"+context.uuid+"_extra_plane" ).change( function(){
				context.highlightMapPlane = $(this).is(":checked");
				if( !context.highlightMapPlane ) forcedPlaneRemoval = false;
				render();
				context.onSTCShadowTrigger( {drawShadows: context.drawShadows, drawHotShadows: context.drawHotShadows, extraPlane: context.highlightMapPlane} );
			});

			$( "#"+context.uuid+"_select_shadows").change( function(){
				var shadowOption = $(this).val();
				if( shadowOption == "none" )
				{
					context.drawShadows = false;
					context.drawHotShadows = false;
				}
				else if( shadowOption == "shadows" || shadowOption == "heatmap" )
				{
					context.drawShadows = true;
					context.drawHotShadows = ( shadowOption == "heatmap" );
					drawCubeShadows( context.visiblePoints );
				}

				setShadowPlanesVisibility( context.drawShadows );
				context.onSTCShadowTrigger( {drawShadows: context.drawShadows, drawHotShadows: context.drawHotShadows, extraPlane: context.highlightMapPlane} );
				render();
			});

			controls.bindToContainerWithException( context.container, div );
			context.container.addEventListener( 'mousewheel', function(){
				if( context.camera.inOrthographicMode ) updateOrthoLens();
			}, false );
		}
	};
	
	// [STC] ADD LAYER FUNCTIONS ::::::::::::::::::::::::::::::::::::	
	/**
	 * Adds a set of layers to the map
	 * @param layer <Array:<TRAJMAP2D.Layer>> layers to be added
	 * @param refresh <Bool> true|flase if the the map is automaticaly updated after adding the layer or not 
	 */ 
	this.addLayers = function( layers, refresh )
	{
		refresh = typeof refresh !== 'undefined' ? refresh : true;
		if( this.stPointsLayers.length === 0 && this.stPeriodLayers.length == 0 )  
		{
			bbox.start = layers[0].data.timePeriod().start;
			bbox.end = layers[0].data.timePeriod().end;
		}
		
		if( tileControls === null )
		{
			bbox.up = -90;
			bbox.down = 90;
			bbox.left = 180;
			bbox.right = -180;		
		}	
		
		for( var i = 0; i < layers.length; i++ )
		{
			var layer = layers[i];
			layer.setSTC( this );
			if( layer instanceof STCJS.SpatioTemporalLayer )
				this.stPointsLayers.push( layer );
			else if( layer instanceof STCJS.STPeriodSetLayer )
				this.stPeriodLayers.push( layer );
			
			if( tileControls === null )
			{
				var bb = layers[i].data.boundingBox();
				bbox.up = (bb.up > bbox.up)? bb.up : bbox.up;
				bbox.down = (bb.down < bbox.down)? bb.down : bbox.down;
				bbox.left = (bb.left < bbox.left)? bb.left : bbox.left;
				bbox.right = (bb.right > bbox.right)? bb.right : bbox.right;		
			}			
			bbox.start = (bbox.start < layers[i].data.timePeriod().start)? bbox.start : layers[i].data.timePeriod().start;
			bbox.end = (bbox.end > layers[i].data.timePeriod().end)? bbox.end : layers[i].data.timePeriod().end;			
		}

		//this.stcUniforms.tstart.value = bbox.start;
		//this.stcUniforms.tend.value = bbox.end;
		
		if( refresh )
		{
			removeTimeAxes();
			drawTimeAxes();
			updateSTC = true;
			update();
		}
	};

	var removeTimeAxes = function()
	{
		for( var i = 0; i < context.cubeData.timeAxesInfo.lines.length || i < context.cubeData.timeAxesInfo.labels.length; i++ )
		{
			if( i < context.cubeData.timeAxesInfo.lines.length ) context.scene.remove( context.cubeData.timeAxesInfo.lines[i] );
			if( context.cubeData.timeAxesInfo.labels[i] !== null && i < context.cubeData.timeAxesInfo.labels.length 
				&& context.cubeData.timeAxesInfo.labels[i].parentNode !== null )// this.stc.container.removeChild( context.cubeData.timeAxesInfo.labels[i] );
				//context.cubeData.timeAxesInfo.labels[i].parentNode.removeChild( context.cubeData.timeAxesInfo.labels[i] );
				document.body.removeChild( context.cubeData.timeAxesInfo.labels[i] );
		}
		context.cubeData.timeAxesInfo.lines = [];
		context.cubeData.timeAxesInfo.labels = [];
	};

	var drawTimeAxes = function()
	{			
		if( context.stPointsLayers.length === 0 && context.stPeriodLayers.length === 0 ) return;
		
		if( context.temporalUnity === STCJS.UTILS.TIME_FLAGS.NONE ) setDefaultTemporalUnity();
		if( context.firstTimeLabel === null ) setDefaultFirstLabel();	
				
		context.cubeData.timeAxesInfo.lines = [];
		context.cubeData.timeAxesInfo.labels = [];
				
		placeTemporalAxis( context.boundingBox().start );
		placeTemporalLabel( context.boundingBox().start, context.temporalUnity, "stcTimeLabel"); //STCJS.UTILS.TIME_FLAGS.NONE, "stcTimeLabel" );		
		//--
		for( var ctime = context.firstTimeLabel; ctime < context.boundingBox().end; ctime += context.temporalUnity )
		{
			placeTemporalAxis( ctime );
			placeTemporalLabel( ctime, context.temporalUnity, "stcTimeLabel" );
		}
		//--
		placeTemporalAxis( context.boundingBox().end );
		placeTemporalLabel( context.boundingBox().end, context.temporalUnity, "stcTimeLabel");// STCJS.UTILS.TIME_FLAGS.NONE,"stcTimeLabel" );
		
		updateTimeAxesLocation();
	};

	/**
	 * Assumes temporal bounding box of the stc being defined as unix timestamps
	 */
	var setDefaultTemporalUnity = function()
	{
		if( ("end" in context.boundingBox()) && ("start" in context.boundingBox()) )
		{
			var deltaTime = ( context.boundingBox().end - context.boundingBox().start );
			
			if( deltaTime >= 1.5*STCJS.UTILS.TIME_FLAGS.ONE_MONTH )
				context.temporalUnity = STCJS.UTILS.TIME_FLAGS.ONE_MONTH;
			else if( deltaTime >= STCJS.UTILS.TIME_FLAGS.ONE_WEEK )
				context.temporalUnity = STCJS.UTILS.TIME_FLAGS.ONE_WEEK;
			else if( deltaTime >= 2*STCJS.UTILS.TIME_FLAGS.ONE_DAY )
				context.temporalUnity = STCJS.UTILS.TIME_FLAGS.ONE_DAY;
			else //if( deltaTime >= STCJS.UTILS.TIME_FLAGS.ONE_HOUR )
				context.temporalUnity = STCJS.UTILS.TIME_FLAGS.ONE_HOUR;
			//else
				//context.stc.timeAxesUnit = deltaTime/5; // default division : 5 lines			
		}
		else
		{
			console.log("ERROR: No data is attached to the STC to allow the determination of the temporal granularity");		
		}
	};

	var setDefaultFirstLabel = function()
	{
		var startTimestamp = new Date( context.boundingBox().start * 1000 );
		if( context.temporalUnity >= STCJS.UTILS.TIME_FLAGS.ONE_MONTH )
			startTimestamp.setMonth( startTimestamp.getMonth()+1 );
		else if( context.temporalUnity >= STCJS.UTILS.TIME_FLAGS.ONE_WEEK )
			startTimestamp.setHours(24); // may need to change later
		else if( context.temporalUnity >= STCJS.UTILS.TIME_FLAGS.ONE_DAY )
			startTimestamp.setHours(24);
		else if( context.temporalUnity >= STCJS.UTILS.TIME_FLAGS.ONE_HOUR )
			startTimestamp.setMinutes(60);
		
		context.firstTimeLabel = startTimestamp.getTime()/1000;
	};

	/**
	 * 
	 */
	var placeTemporalAxis = function( when, fullLine )
	{
		var axisLine = new THREE.Line( new THREE.Geometry(), 
			new THREE.LineBasicMaterial( 
				{ 
					transparent: !context.showTimeAxesLines, 
					opacity: (context.showTimeAxesLines), 
					color: 0x000000, 
					linewidth: 1
				})
		);
		
		var timeDomain = [context.boundingBox().start, context.boundingBox().end];
		var timeRange  = [context.cubeData.planeTimeNorth.position.y-context.cubeData.planeTimeNorth.scale.y/2, context.cubeData.planeTimeNorth.position.y+context.cubeData.planeTimeNorth.scale.y/2];
		
		var yPos = UTILS.scaleDimension(timeDomain, timeRange, when); 
		
		axisLine.geometry.vertices.push( new THREE.Vector3((context.cubeData.pos.x - context.cubeData.size.x/2)+0.1, yPos, (context.cubeData.pos.z + context.cubeData.size.z/2)+0.1) );
		axisLine.geometry.vertices.push( new THREE.Vector3((context.cubeData.pos.x - context.cubeData.size.x/2)+0.1, yPos, (context.cubeData.pos.z - context.cubeData.size.z/2) +0.1) );
		axisLine.geometry.vertices.push( new THREE.Vector3((context.cubeData.pos.x + context.cubeData.size.x/2)+0.1, yPos, (context.cubeData.pos.z - context.cubeData.size.z/2) +0.1) );
		
		if( fullLine != undefined && fullLine )
		{
			axisLine.geometry.vertices.push( new THREE.Vector3((context.cubeData.pos.x + context.cubeData.size.x/2)+0.1, yPos, (context.cubeData.pos.z + context.cubeData.size.z/2)+0.1) );
			axisLine.geometry.vertices.push( new THREE.Vector3((context.cubeData.pos.x - context.cubeData.size.x/2)+0.1, yPos, (context.cubeData.pos.z + context.cubeData.size.z/2)+0.1) );
			axisLine.hype = true;
		}
		
		axisLine.name = "axisLine";
		axisLine.currentRepresentedTime = when;
		context.scene.add(axisLine);
		context.cubeData.timeAxesInfo.lines.push(axisLine);
		
		return axisLine;			
	};
	
	/**
	 * 
	 */
	var placeTemporalLabel = function( when, timeUnit, labelName )
	{
		//var div = createTimelineLabelDiv( ctime, "stcTimeLabel" );	
				
		var div = document.createElement( "div" );
		div.setAttribute( "id", labelName+":"+when );
		div.setAttribute( "name", labelName );	
		div.currentRepresentedTime = when;
		div.style.position = 'absolute';
					
		div.className = "stc-time-label";
		// default style?
		div.style.backgroundColor = "white";		
		div.style.borderRadius = "3px";
		div.style.border = "1px solid black";
		div.style.fontSize = "12";
		div.style.fontFamily = "Arial,sans-serif";
		div.style.opacity = "0.9";
		div.style.textAlign = "center";
		
		div.innerHTML = "<b>"+ (  
		(context.formatTimeLabelFunction !== null )?
			context.formatTimeLabelFunction( when, timeUnit ) :  
			STCJS.UTILS.getTextualTimestamp( when, timeUnit ) )+"</b>";
		
		context.cubeData.timeAxesInfo.labels.push( div );			
		div.style.visibility = (context.showTimeAxesLabels)? "visible" : "hidden";
		//context.container.appendChild( div );
		document.body.appendChild( div );
		return div;
	};

	/**
	 *@param refresh - true or false to update temporal boundaries or not
	 */
	this.removeLayers = function( layers, refresh )
	{
		refresh = typeof refresh !== 'undefined' ? refresh : true;

		var onefound = false;
		var needsSpatialUpdate, needsTemporalUpdate;
		needsSpatialUpdate = needsTemporalUpdate = false;
		for( var li = 0, ll = layers.length; li < ll; li ++ )
		{
			var found = false;
			var layer = layers[li];

			// remove layer contents from view
			layer.removeLayer();

			// remove layer from stc
			
			var index = 0;
			for( index = 0, l = this.stPointsLayers; index < l && !found; index++ )
				found = layer.name === this.stPointsLayers[index].name;
			if( found ) this.stPointsLayers = this.stPointsLayers.split( index, 1 );

			for( index = 0, l = this.stPeriodLayers; index < l && !found; index++ )
				found = layer.name === this.stPeriodLayers[index].name;
			if( found ) this.stPeriodLayers = this.stPeriodLayers.split( index, 1 );

			for( index = 0, l = this.highlightLayers; index < l && !found; index++ )
				found = layer.name === this.highlightLayers[index].name;
			if( found ) this.highlightLayers = this.highlightLayers.split( index, 1 );
			
			var bb = layer.data.boundingBox();
			needsSpatialUpdate = needsSpatialUpdate && ( tileControls === null && (bbox.up === bb.up || bbox.down === bb.down || bbox.left === bb.left || bbox.right === bb.right) );
			needsTemporalUpdate = needsTemporalUpdate && ( (bbox.start === bb.start && refresh) || (bbox.end === bb.end && refresh) );
			onefound = onefound || found;
		}		
		var needsUpdate = needsSpatialUpdate || needsTemporalUpdate;

		if( needsUpdate )
		{
			if( needsSpatialUpdate )
			{
				bbox.up = -90;
				bbox.down = 90;
				bbox.left = 180;
				bbox.right = -180;
			}
			else
			{				
				bbox.start = (new Date()).getTime();
				bbox.end = -1;
			}
			
			for( var i = 0, l1 = this.stPointsLayers.length, l2 = this.stPeriodLayers.length; i < l1 || i < l2; i++ )
			{
				var bb = null;
				var tp = null;
				if( i < l1 )
				{
					bb = this.stPointsLayers[i].data.boundingBox();
					tp = this.stPointsLayers[i].data.timePeriod();

					if( needsSpatialUpdate )
					{
						bbox.up = (bb.up > bbox.up)? bb.up : bbox.up;
						bbox.down = (bb.down < bbox.down)? bb.down : bbox.down;
						bbox.left = (bb.left < bbox.left)? bb.left : bbox.left;
						bbox.right = (bb.right > bbox.right)? bb.right : bbox.right;
					}
					if( needsTemporalUpdate )
					{					
						bbox.start = (bbox.start < tp.start)? bbox.start : tp.start;
						bbox.end = (bbox.end > tp.end)? bbox.end : tp.end;
					}
				}
				if( i < l2  )
				{
					bb = this.stPeriodLayers[i].data.boundingBox();
					tp = this.stPeriodLayers[i].data.timePeriod();					

					if( needsSpatialUpdate )
					{
						bbox.up = (bb.up > bbox.up)? bb.up : bbox.up;
						bbox.down = (bb.down < bbox.down)? bb.down : bbox.down;
						bbox.left = (bb.left < bbox.left)? bb.left : bbox.left;
						bbox.right = (bb.right > bbox.right)? bb.right : bbox.right;
					}
					if( needsTemporalUpdate )
					{					
						bbox.start = (bbox.start < tp.start)? bbox.start : tp.start;
						bbox.end = (bbox.end > tp.end)? bbox.end : tp.end;
					}
				}
			}
		}

		if( onefound )
		{
			removeTimeAxes();
			drawTimeAxes();
			updateSTC = true;
			update();
		}

		return onefound;
	};

	/**
	 * remove all contents from the stc
	 */
	this.clearSTC = function()
	{
		context.onFeatureHoverStop();
		removeTemporaryHighlights();
		for( var i = 0, l1 = this.stPointsLayers.length,
			l2 = this.stPeriodLayers.length,
			l3 = this.highlightLayers.length; i < l1 || i < l2 || i < l3; i++ )
		{
			if( i < l1 )
			{
				this.stPointsLayers[i].removeLayer();
				this.stPointsLayers[i].stcMap = null;
			}
			if( i < l2 )
			{
				this.stPeriodLayers[i].removeLayer();
				this.stPeriodLayers[i].stcMap = null;
			}
			if( i < l3 )
			{
				this.highlightLayers[i].removeLayer();
				this.highlightLayers[i].stcMap = null;
			}
		}

		this.stPointsLayers = [];
		this.stPeriodLayers = [];
		this.highlightLayers = [];

		if( tileControls === null )
		{
			bbox.up = -90;
			bbox.down = 90;
			bbox.left = 180;
			bbox.right = -180;
		}
		bbox.start = (new Date()).getTime();
		bbox.end = -1;

		removeTimeAxes();		
		updateSTC = true;
		update();
	};
	
	// [STC] auxiliar FUNCTIONS :::::::::::::::::::::::::::::::::::::	
	
	/* */
	var panSTCMap = function( dir )
	{
		if( dir === DIR.NORTH ) tileControls.goNorth();
		else if( dir === DIR.SOUTH ) tileControls.goSouth();
		else if( dir === DIR.WEST ) tileControls.goWest();
		else if( dir === DIR.EAST ) tileControls.goEast();
		
		context.onSTCMapPan( dir, tileControls.currentTile );
		
		if( bbox.up !== tileControls.currentTile.bbox.up || bbox.left !== tileControls.currentTile.bbox.left )
		{			
			//$( "#"+context.uuid+"_mapzoom" ).slider( "value", tileControls.currentTile.zoomlevel );

			bbox.up = tileControls.currentTile.bbox.up;
			bbox.down = tileControls.currentTile.bbox.down;
			bbox.left = tileControls.currentTile.bbox.left;
			bbox.right = tileControls.currentTile.bbox.right;			
			updateCubeMapTexture( tileControls.currentTile.image );
			updateSTC = true;
			isOnContainer = true;
			updateDataPosition();
			render();
		}		
	};
	
	/** **/
	this.fitBounds = function( boundBox )
	{
		//console.log( JSON.stringify( tileControls.currentTile.bbox ) );
		tileControls.fitInBBox( boundBox );
		//console.log( JSON.stringify( tileControls.currentTile.bbox ) );
		//console.log("----------------------------------------------");

		if( bbox.up !== tileControls.currentTile.bbox.up || bbox.left !== tileControls.currentTile.bbox.left )
		{			
			$( "#"+this.uuid+"_mapzoom" ).slider( "value", tileControls.currentTile.zoomlevel );

			bbox.up = tileControls.currentTile.bbox.up;
			bbox.down = tileControls.currentTile.bbox.down;
			bbox.left = tileControls.currentTile.bbox.left;
			bbox.right = tileControls.currentTile.bbox.right;			

			updateCubeMapTexture( tileControls.currentTile.image );
			updateSTC = true;
			updateDataPosition();
			render();
		}
	};

	this.fitZoomCenter = function( zoom, center )
	{
		tileControls.setClosestZoomCenter( zoom, center );

		if( bbox.up !== tileControls.currentTile.bbox.up || bbox.left !== tileControls.currentTile.bbox.left )
		{			
			//$( "#"+this.uuid+"_mapzoom" ).slider( "value", tileControls.currentTile.zoomlevel );

			bbox.up = tileControls.currentTile.bbox.up;
			bbox.down = tileControls.currentTile.bbox.down;
			bbox.left = tileControls.currentTile.bbox.left;
			bbox.right = tileControls.currentTile.bbox.right;			

			updateCubeMapTexture( tileControls.currentTile.image );
			updateSTC = true;
			updateDataPosition();
			render();
		}
	};

	/** **/
	this.getCurrentTile = function()
	{
		return (tileControls === null)? null : tileControls.currentTile;
	};

	/** **/
	this.onSTCMapPan = function( direction, newTile )
	{
	};
	
	/** **/
	this.onSTCZoom = function( zoomFactor, newZoomTile )
	{
		
	};
	
	/* */
	var zoomSTC = function( zoomfactor )
	{
		if( zoomfactor == 1 ) tileControls.zoomIn();
		else if( zoomfactor == -1 ) tileControls.zoomOut();
		
		context.onSTCZoom( zoomfactor, tileControls.currentTile );
		
		if( bbox.up !== tileControls.currentTile.bbox.up || bbox.left !== tileControls.currentTile.bbox.left )
		{
			$( "#"+context.uuid+"_mapzoom").slider( "value", tileControls.currentTile.zoomlevel );
			bbox.up = tileControls.currentTile.bbox.up;
			bbox.down = tileControls.currentTile.bbox.down;
			bbox.left = tileControls.currentTile.bbox.left;
			bbox.right = tileControls.currentTile.bbox.right;			
			updateCubeMapTexture( tileControls.currentTile.image );
			updateSTC = true;
			isOnContainer = true;
			updateDataPosition();
			render();
		}
	};
	
	/* */
	var setSTCZoom = function( zoomlevel )
	{
		if( zoomlevel <= tileControls.maxZoom && zoomlevel >= tileControls.minZoom )
		{
			var factor = (zoomlevel < tileControls.currentTile.zoomlevel)? -1 : 1;
			var czoomIO = tileControls.currentTile.zoomlevel;
			while( czoomIO !== null && czoomIO != zoomlevel )
			{
				if( factor == 1 ) tileControls.zoomIn();
				else if( factor == -1 ) tileControls.zoomOut();
				
				czoomIO = tileControls.currentTile.zoomlevel;
			}
			
			if( bbox.up !== tileControls.currentTile.bbox.up || bbox.left !== tileControls.currentTile.bbox.left )
			{				
				bbox.up = tileControls.currentTile.bbox.up;
				bbox.down = tileControls.currentTile.bbox.down;
				bbox.left = tileControls.currentTile.bbox.left;
				bbox.right = tileControls.currentTile.bbox.right;			
				updateCubeMapTexture( tileControls.currentTile.image );
				updateSTC = true;
				isOnContainer = true;
				updateDataPosition();
				render();
			}
		}
	};
	
	/**
	 * 
	 */
	this.boundingBox = function()
	{
		return bbox; // possibly compute
	}; 
	
	/**
 	 * Converts a STPoint into a corresponding Vector3 point within the STC
 	 * (Uses the mercator projection)
	 * @param stpoint - STPoint to be converted
	 */	
	this.stpoint2stc = function( stpoint )
	{
		// uses the mercator projection
		if( !this.cubeData.invertedTime )
			var timeDomain = [bbox.start, bbox.end];
		else
			var timeDomain = [bbox.end, bbox.start];

		var timeRange = [ this.cubeData.planeTimeNorth.position.y-this.cubeData.planeTimeNorth.scale.y/2, this.cubeData.planeTimeNorth.position.y+this.cubeData.planeTimeNorth.scale.y/2]; //<---		
		var time = UTILS.scaleDimension( timeDomain, timeRange, stpoint.timestamp );
		
		var topLeftPoint = new STPoint( bbox.up, bbox.left, -1, -1 );
		
		var south = UTILS.deg2rad( bbox.down );
		var north = UTILS.deg2rad( bbox.up );
		var west = UTILS.deg2rad( bbox.left );
		var east = UTILS.deg2rad( bbox.right );
				
		var w = this.cubeData.size.x;
		var h = this.cubeData.size.z; 
		
		var mercY = function( lat ){ return Math.log( Math.tan(lat/2 + Math.PI/4) ) };
		
		var ymin = mercY( south );
		var ymax = mercY( north );
		var xFactor = w/( east-west );
		var yFactor = h/( ymax-ymin );
		
		var mapProjection = function( lat, lon )
		{
			var x = lon;
			var y = mercY(lat);
			
			x = ( x-west )*xFactor;
			y = ( ymax-y )*yFactor;
			
			return [x, y];
		};
		
		var projPoint = mapProjection( UTILS.deg2rad( stpoint.latitude ), UTILS.deg2rad( stpoint.longitude ) );
		
		var lat = this.cubeData.pos.z-this.cubeData.size.z/2 + projPoint[1];
		var lon = this.cubeData.pos.x-this.cubeData.size.x/2 + projPoint[0];
			
		var nstcpoint = new THREE.Vector3( lon, time, lat );
			
		return nstcpoint;
	};
	
	/**
	 * Probably needs to be changed
	 * Converts a Vector3 point (stcpoint) to an STpoint (with lat, lon, and timestamp)
	 * @param stcPoint - Vector3 point to be converted
	 */ 
	this.stc2stpoint = function( stcPoint )
	{
		if( !this.cubeData.invertedTime )
			var timeRange = [bbox.start, bbox.end];
		else
			var timeRange = [bbox.end, bbox.start];

		var timeDomain = [context.cubeData.planeTimeNorth.position.y-context.cubeData.planeTimeNorth.scale.y/2, 
			context.cubeData.planeTimeNorth.position.y+context.cubeData.planeTimeNorth.scale.y/2];

		var lonRange = [bbox.left, bbox.right];
		var latRange = [bbox.up, bbox.down]; // latitude increases inversely to the cube's coordinates

		var lonDomain = [context.cubeData.pos.x-context.cubeData.size.x/2, context.cubeData.pos.x+context.cubeData.size.x/2];
		var latDomain = [context.cubeData.pos.y-context.cubeData.size.y/2, context.cubeData.pos.y+context.cubeData.size.y/2];

		var lat = UTILS.scaleDimension( latDomain, latRange, stcPoint.z );
		var lon = UTILS.scaleDimension( lonDomain, lonRange, stcPoint.x );
		var time = UTILS.scaleDimension( timeDomain, timeRange, stcPoint.y );

		return new STPoint( lat, lon, 0, time );		
	};
	
	/**
	 * Converts a set of 3 coordinates into a 2D screen point
	 * @param x - x coordinate
	 * @param y - y coordinate
	 * @param z - z coordinate	 
	 * @return an object with two attributes, x and y, containing the x and y screen coordinates of the point x, y, z
	 */ 
	this.stcTo2Dpoint = function( x, y, z )
	{
		var vec = new THREE.Vector3( x, y, z );
		//var vector = projector.projectVector( vec, this.camera );
		var vector = vec.project( this.camera );				

		var result = new Object();
		var halfWidth = this.width / 2;
		var halfHeight = this.height / 2;
		
		result.x = (vector.x * halfWidth + halfWidth);// + document.getElementById("map").offsetWidth;// +(window.innerWidth-rendererWidth);
		result.y = (-vector.y * halfHeight + halfHeight );
				
		var p = UTILS.findObjectPosition(this.container);			
		result.x += p[0];
		result.y += p[1];
		
		return result;
	};
	
	/*this.updateTemporalScale = function( timestampStart, timestampEnd, temporalUnity )
	{
		if( typeof temporalUnity == "undefined" ) temporalUnity = STCJS.UTILS.TIME_FLAGS.NONE;
		bbox.start = timestampStart;
		bbox.end = timestampEnd;

		this.temporalUnity = temporalUnity; //STCJS.UTILS.TIME_FLAGS.NONE;		
		removeTimeAxes();
		this.firstTimeLabel = null;
		drawTimeAxes();
		updateSTC = true;
		update();
	};*/

	this.updateTemporalScale = function( timestampStart, timestampEnd, temporalUnity, firstLabelTime )
	{
		bbox.start = timestampStart;
		bbox.end = timestampEnd;
		if( typeof temporalUnity == "undefined" || temporalUnity == null ) temporalUnity = STCJS.UTILS.TIME_FLAGS.NONE; 
		this.firstTimeLabel = ( typeof firstLabelTime == "undefined" )? null : firstLabelTime; //timestampStart + temporalUnity;

		//this.temporalUnity = STCJS.UTILS.TIME_FLAGS.NONE;	
		removeTimeAxes();

		drawTimeAxes();
		updateSTC = true;
		update();
	};

	this.updateTemporalFocus = function( temporalFocus, start, end )
	{
		this.stcUniforms.tfocus.value = temporalFocus;
		this.stcUniforms.tstart.value = start;
		this.stcUniforms.tend.value = end;

		render();
	};

	var forcedPlaneRemoval = false;
	/*
	 * 
	 */
	var resizeSTC = function( timeSize )
	{
		// assuming this as the flatview
		if( timeSize <= context.cubeData.startheigth*0.1 )
		{
			if( !forcedPlaneRemoval && context.highlightMapPlane ) forcedPlaneRemoval = true;
			context.highlightMapPlane = false;
			$("#"+context.uuid+"_extra_plane").prop('checked', false); 
			render();
			context.onSTCShadowTrigger( {drawShadows: context.drawShadows, drawHotShadows: context.drawHotShadows, extraPlane: context.highlightMapPlane} );
		}
		else
		{
			if( forcedPlaneRemoval )
			{
				context.highlightMapPlane = true;
				$("#"+context.uuid+"_extra_plane").prop('checked', true); 
			}
		}

		updateTimeAxesLocation();
		context.onSTCHeightResize( timeSize );
		// #1 Resize the context.cubeData ::::::::::::::::::::::::::::::::::::::::::
		resizeSTCHeight( timeSize );
		// #2 Reposition the trajectories ::::::::::::::::::::::::::::::
		updateDataPosition();
		render();
	};

	var resizeSTCHeight = function( size )
	{
		context.cubeData.size.y = size;
		// #1 Resize planes ::::::::::::::::::::::::::::::::::::::::::::
		context.cubeData.planeTimeNorth.scale.y = size;
		context.cubeData.planeTimeNorth.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size/2;
		context.cubeData.planeTimeWest.scale.y = size;
		context.cubeData.planeTimeWest.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size/2;
		
		// #2 Resize lines :::::::::::::::::::::::::::::::::::::::::::::
		/*context.cubeData.baseSpaceLinesUp.geometry.vertices[0].y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size;
		context.cubeData.baseSpaceLinesUp.geometry.vertices[1].y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size;
		context.cubeData.baseSpaceLinesUp.geometry.vertices[2].y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size;
		context.cubeData.baseSpaceLinesUp.geometry.vertices[3].y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size;
		context.cubeData.baseSpaceLinesUp.geometry.vertices[4].y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size;
		context.cubeData.baseSpaceLinesUp.geometry.verticesNeedUpdate = true;*/
		
		// #3 Reposition upper plane ::::::::::::::::::::::::::::::::::::
		context.cubeData.mapPlaneUp.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size;
		context.cubeData.shadowPlaneUp.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + size - 0.1;
		
		// resize axes???
		render();
	};
	
	/** **/
	this.onSTCHeightResize = function( timeSize )
	{
	};
	
	/*
	 * TODO - visiblePoints on other types of layers
	 */
	var updateDataPosition = function()
	{
		context.visiblePoints = [];
		for( var i = 0; i < context.stPointsLayers.length; i++ )
		{
			context.stPointsLayers[i].updateRepresentationLocation();
			context.visiblePoints = context.visiblePoints.concat( context.stPointsLayers[i].getRepresentationVisiblePoints() );
		}
		for( var i = 0; i < context.stPeriodLayers.length; i++ )
			context.stPeriodLayers[i].updateRepresentationLocation();			
		for( var i = 0; i < context.highlightLayers.length; i++ )
			context.highlightLayers[i].updateRepresentationLocation();
		
		drawCubeShadows( context.visiblePoints );
		updateTimeAxesLocation();		
	};

	/*
	 * 
	 */
	var update = function()
	{
		if( !updateSTC ) return;

		context.visiblePoints = [];
		
		for( var i = 0; i < context.stPointsLayers.length || i < context.stPeriodLayers.length; i++ )
		{
			if( i < context.stPointsLayers.length && context.stPointsLayers[i].visible )
			{
				context.stPointsLayers[i].removeLayer();
				context.stPointsLayers[i].drawLayer();
				
				context.visiblePoints = context.visiblePoints.concat( context.stPointsLayers[i].getRepresentationVisiblePoints() );
			}
			if( i < context.stPeriodLayers.length && context.stPeriodLayers[i].visible )
			{
				context.stPeriodLayers[i].removeLayer();
				context.stPeriodLayers[i].drawLayer();				
			}			
		}
		// draw shadow if needed
		drawCubeShadows( context.visiblePoints );
		
		updateSTC = false;
	};
	
	this.refresh = function( updateStructures)
	{
		//stcMap.updateSTCMapShadows();
		render();
	};

	this.updateSTCMapShadows = function()
	{
		this.visiblePoints = [];
		
		for( var i = 0; i < this.stPointsLayers.length || i < this.stPeriodLayers.length; i++ )
		{
			if( i < this.stPointsLayers.length && this.stPointsLayers[i].visible )
			{
				this.visiblePoints = this.visiblePoints.concat( this.stPointsLayers[i].getRepresentationVisiblePoints() );
			}
			if( i < this.stPeriodLayers.length && this.stPeriodLayers[i].visible )
			{
			}			
		}
		// draw shadow if needed
		drawCubeShadows( this.visiblePoints );
	};

	var setShadowPlanesVisibility = function( visible )
	{
		context.cubeData.shadowPlaneDown.material.opacity = (visible && context.cubeData.shadowmap != "")? 1 : 0;
		context.cubeData.shadowPlaneUp.material.opacity = (visible && context.cubeData.shadowmap != "")? 1 : 0;

		context.cubeData.shadowPlaneDown.material.needsUpdate = true;
		context.cubeData.shadowPlaneUp.material.needsUpdate = true;

		render();
	};

	var drawCubeShadows = function( dataPoints )
	{
		setShadowPlanesVisibility( true );

		var canvas = document.createElement('canvas');
		canvas.setAttribute( "id", context.uuid+'cvsid' );
		var ctx = canvas.getContext('2d');
		ctx.canvas.width = 512;
		ctx.canvas.height = 512;
		document.body.appendChild( canvas );
		
		var heat = simpleheat( context.uuid+'cvsid')
			.max( 1 )
			.radius( 5, 10);
		if( !context.drawHotShadows ) heat.gradient( { 0.3: '#aaa', 0.6: '#777', 1: '#111'} );

		if( context.drawShadows )
		{
			var bb = bbox;
			for( var i = 0, np = dataPoints.length; i < np; i++ )
			{
				var dp = dataPoints[i];
				var point = [
					UTILS.scaleDimension( [bb.left, bb.right], [0, 500], dp.longitude ), 
					UTILS.scaleDimension( [bb.up, bb.down], [0, 500], dp.latitude ), 
					1 // to change?
				];
				heat.add( point );
			}
		}
		
		heat.draw();
		var texture = new THREE.Texture( canvas ); 
		texture.needsUpdate = true;
		
		updateMapShadows( texture );
		document.body.removeChild( canvas );
	};

	var updateMapShadows = function( texture )
	{
		context.cubeData.shadowmap = texture;

		context.cubeData.shadowPlaneDown.material.map = texture;
		context.cubeData.shadowPlaneDown.material.needsUpdate = true;		

		context.cubeData.shadowPlaneUp.material.map = texture;				
		context.cubeData.shadowPlaneUp.material.needsUpdate = true;				
		render();
	};

	/* NOT USED */
	this.getDataShadowForTime = function( dataPoints, time )
	{
		var canvas = document.createElement('canvas');
		canvas.setAttribute( "id", "cvsid" );
		var ctx = canvas.getContext('2d');
		ctx.canvas.width = 500;
		ctx.canvas.height = 500;
		document.body.appendChild( canvas );
		
		var heat = simpleheat('cvsid')
			.max( 1 )
			.radius( 5, 10);
		if( !this.drawHotShadows ) heat.gradient( { 0.3: '#aaa', 0.6: '#777', 1: '#111'} );

		var bb = bbox;
		//var maxdist = Math.max( Math.abs( time-bb.start ), Math.abs( bb.end-time ) );
		for( var i = 0, np = dataPoints.length; i < np; i++ )
		{
			var dp = dataPoints[i];
			if( dp.timestamp >= time )
			{
				//var mdist = Math.abs( dp.timestamp-time );
				var point = [
					UTILS.scaleDimension( [bb.left, bb.right], [0, 500], dp.longitude ), 
					UTILS.scaleDimension( [bb.up, bb.down], [0, 500], dp.latitude ), 
					1//-(mdist/maxdist) // to change?
				];
				heat.add( point );
			}
		}
		
		heat.draw();
		var texture = new THREE.Texture( canvas );
		texture.needsUpdate = true;
		document.body.removeChild( canvas );

		return texture;
	};
	
	/*
	 * Obtains a layer given a name
	 * @param layerName - name of the layer to be found
	 * @returns - the Layer with the corresponding name, or null if not found 
	 */
	var layerByName = function( layerName )
	{
		var hasFound = false;
		var i = 0;
		var layer = null;
		
		while( !hasFound && i < context.stPointsLayers.length )
		{
			hasFound = context.stPointsLayers[i].name === layerName;
			i++;
		}
		i--;
		if( hasFound )
			layer = context.stPointsLayers[i];
		else
		{
			i = 0;
			while( !hasFound && i < context.stPeriodLayers.length )
			{
				hasFound = context.stPeriodLayers[i].name === layerName;
				i++;
			}
			i--;
			
			if( hasFound )
				layer = context.stPeriodLayers[i];
			/*else
			{
				i = 0;
				while( !hasFound && i < context.highlightLayers.length )
				{
					hasFound = context.highlightLayers[i].name === layerName;
					i++;
				}
				i--;
				
				if( hasFound )
					layer = context.highlightLayers[i];
			}*/
		}			
		return layer;
	};
	
	// [STC] onSOMETHING FUNCTIONS :::::::::::::::::::::::::::::::::::::
	var mouseDown;
	var isPanning;
	var doubleClick;
	var onMouseDown = function( event )
	{
		mouseDown = true;
		//controls.enabled = true;
	};
	
	var onMouseUp = function( event )
	{
		mouseDown = false;
		//controls.enabled = false;
		if( isPanning )
		{
			isPanning = false;			
			context.onSTCPanStop( event );
		}
		updateCamera();						
	};
	
	var onMouseMove = function( event )
	{
		isOnContainer = true;
		mouseevent = event;
		
		if( isOnContainer && mouseDown )
		{
			isPanning = true;
			context.onSTCPanStart( event );
		}
		updateCamera();
	};

	this.forceUpdateCamera = function(){
		updateCamera();
	};

	var updateCamera = function(){
		var flag = context.camera.inOrthographicMode;

		if( context.camera.rotation._x < -1.4 || context.forced2D ){
			updateOrthoLens();
		}
		else if( !context.forced2D )
		{
			context.camera.toPerspective();
			context.camera.setLens( 45 );
		}

		if( context.camera.inOrthographicMode && context.camera.inOrthographicMode != flag ) 
			controls.rotateUp( Math.PI/2 );
	}

	var updateOrthoLens = function(){
		context.camera.toOrthographic();
		var lens = (375*context.cubeData.size.z/context.camera.position.y); //255
		context.camera.setLens( lens );
		if( !mouseDown ) controls.rotateUp( Math.PI/2 );
		//else context.camera.rotation.x = -Math.PI/2;
		//controls.update();
	}
	
	var onMouseOut = function( event )
	{
		isOnContainer = false;
	};
	
	var onDoubleClick = function( event )
	{
		doubleClick = true;
	};
	
	/** */
	this.onSTCPanStart = function( event )
	{
		
	};
	
	/** */
	this.onSTCPanStop = function( event )
	{
		
	};

	/** */
	this.onSpatialHighlight = function( event )
	{

	};

	/** */
	this.onTemporalHighlight = function( event ) 
	{
	};

	/** */
	this.onTemporalPlaneHover = function( event )
	{
	};

	/** */
	this.onSTCShadowTrigger = function( event )
	{
	};
		
	var overMiniMap = function()
	{
					
	};

	var isOverMM = function()
	{
		var hl = -1+((context.width-context.overviewScale*context.height)/context.width)*2;
		var vl = 1-(1-context.overviewScale)*2;		
		var overMM = ( mouse.x > hl && mouse.y < vl );

		return showOverview && overMM;
	};

	var detectViewIntersections = function()
	{
		var p = UTILS.findObjectPosition(context.container);
		mouse.x = (mouseevent.pageX - (context.width/2) - p[0])/(context.width/2);
		mouse.y = -(mouseevent.pageY - (context.height/2)-p[1])/(context.height/2);
		
		//console.log( "detect view intersection ", p, mouse.x, mouse.y );
		//var overMM = showOverview && isOverMM(); // overMiniMap

		var hl = -1+((context.width-context.overviewScale*context.height)/context.width)*2;
		var vl = 1-(1-context.overviewScale)*2;		
		var overMM = ( mouse.x > hl && mouse.y < vl ) && showOverview;
	
		// ---
		var intersects = null;
		if( overMM )
		{
			mouse.x = UTILS.scaleDimension( [hl,1], [-1, 1], mouse.x );
			mouse.y = UTILS.scaleDimension( [-1,vl], [-1, 1], mouse.y );
			
			var vector = new THREE.Vector3( mouse.x, mouse.y, -1 );
			vector.unproject( context.camera );			
			var dir = new THREE.Vector3( 0, -1, 0 ); 
			var raycaster = new THREE.Raycaster();
			//raycaster.linePrecision = 3;
			raycaster.set( vector, dir );	
			intersects = raycaster.intersectObjects( context.scene.children );			
			//console.log( "int>>", intersects );
			doubleClick = false;			
		}
		else
		{
			if( context.camera.inOrthographicMode )
			{
				//mouse.x = UTILS.scaleDimension( [hl,1], [-1, 1], mouse.x );
				//mouse.y = UTILS.scaleDimension( [-1,vl], [-1, 1], mouse.y );
				
				var vector = new THREE.Vector3( mouse.x, mouse.y, -1 );
				vector.unproject( context.camera );			
				var dir = new THREE.Vector3( 0, -1, 0 ); 
				var raycaster = new THREE.Raycaster();
				//raycaster.linePrecision = 3;
				raycaster.set( vector, dir );	
				raycaster.linePrecision = 3;
				raycaster.params.Points.threshold = 10;
				intersects = raycaster.intersectObjects( context.scene.children );			
				//console.log( "int>>", intersects );			
			}
			else
			{
				var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );		
				vector = vector.unproject( context.camera );
			    var dir = vector.sub( context.camera.position ).normalize();
				var ray = new THREE.Ray( context.camera.position, dir );
				var minC = new THREE.Vector3( context.cubeData.pos.x - context.cubeData.size.x/2, context.cubeData.pos.z - context.cubeData.size.z/2, context.cubeData.pos.y - context.cubeData.size.z/2 );
				var maxC = new THREE.Vector3( context.cubeData.pos.x + context.cubeData.size.x/2, context.cubeData.pos.z + context.cubeData.size.y, context.cubeData.pos.y + context.cubeData.size.z/2 );		
									
				if( ray.intersectBox( new THREE.Box3( minC, maxC ) ) )
				{
					var raycaster = new THREE.Raycaster( context.camera.position, dir );
					raycaster.linePrecision = 3;
					raycaster.params.Points.threshold = 10;
					intersects = raycaster.intersectObjects( context.scene.children, true );
				}
				else
					doubleClick = false;	
			}
		}

		return intersects;
	};

	var detectSTCMouseIntersectionIndex = function( intersects )
	{
		var overMM = isOverMM();

		var selectedIndex = 0;
		if( overMM )
		{
			var forcedEnd = false;
			for( var i = 0; i < intersects.length && !forcedEnd; i++ )
			{
				forcedEnd = intersects[i].object.name !== "mapPlane" && 
					(!(intersects[i].object instanceof THREE.Line) || (intersects[i].object instanceof THREE.Line) && intersects[i].distanceToRay < 5 );
				
				if( forcedEnd ) selectedIndex = i;						
			}
		}
		else
		{
			var forcedEnd = false;
			for( var i = 0; i < intersects.length && !forcedEnd; i++ )
			{
				forcedEnd = intersects[i].object.name !== "mapPlaneHighlight" && 
							intersects[i].object.name !== "mapPlaneHighlightShadow";
				if( forcedEnd ) selectedIndex = i;						
			}
		}

		return selectedIndex;
	};
		
	//var frame = 0;
	/*
	 * Responsible for detecting mouse collisions and some interactive comands over the STC
	 */
	var animate = function( )
	{		
		if( mouseevent === null || !isOnContainer ) return;	

		var doubleClicked = doubleClick; 
		updateTimeAxesLocation();
		updatePopUpWindows();
		var intersects = detectViewIntersections();

		if( intersects != null )
		{		
			if( intersects.length > 0 && ( context.stPeriodLayers.length > 0 || context.stPointsLayers.length > 0 ) )
			{
				var selectedIndex = detectSTCMouseIntersectionIndex( intersects );
				var selectedObject = intersects[selectedIndex].object;			
				var intersectionPoint = intersects[selectedIndex].point;											

				//console.log( "intersects", intersects, selectedIndex );

				// verify time plane intersection
				if( selectedObject.name === context.cubeData.planeTimeNorth.name || selectedObject.name === context.cubeData.planeTimeWest.name )
				{					
					computeTemporalPlaneIntersection( intersects, selectedIndex );								
				}
				// verify mapPlane Intersection
				else if( selectedObject.name === context.cubeData.mapPlane.name  || selectedObject.name === context.cubeData.shadowPlaneDown.name 
					   || selectedObject.name === "mapPlaneHighlight" || selectedObject.name === "mapPlaneHighlightShadow" || selectedObject.name === "mapPlaneHighlightShadowDown" )
				{
					computeSpatialPlaneInteraction( intersects, selectedIndex );
				}
				// verify data object intersection
				else
				{		
					var dataEvent = false;
					var overMMap = isOverMM();

					if( selectedObject.objtype === STCJS.UTILS.OBJECT_TYPES.PARTICLE_POINT )
					{						
						var eventParams = computeParticleIntersection( selectedObject, intersects[selectedIndex].index );//vertex );
						eventParams.hoverMiniMap = overMMap;
						context.onFeatureHover( eventParams );
						mostRecentHighlightEvent = eventParams;					
						dataEvent = true;
					}
					else if( selectedObject.objtype === STCJS.UTILS.OBJECT_TYPES.CUBE_POINT || 
							 selectedObject.objtype === STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT )
					{
						var eventParams = computeMeshIntersection( selectedObject );
						eventParams.hoverMiniMap = overMMap;
						context.onFeatureHover( eventParams );
						mostRecentHighlightEvent = eventParams;												
						dataEvent = true;
					}
					else if( selectedObject.objtype === STCJS.UTILS.OBJECT_TYPES.LINE )
					{
						var eventParams = computeLineIntersection( selectedObject, intersects[selectedIndex].point, intersects, selectedIndex );
						eventParams.hoverMiniMap = overMMap;
						context.onFeatureHover( eventParams );						
						mostRecentHighlightEvent = eventParams;
						dataEvent = true;
					}
					else if( selectedObject.objtype === STCJS.UTILS.OBJECT_TYPES.POLYLINE )
					{						
						var eventParams = computePolyLineIntersection( selectedObject, intersects );
						eventParams.hoverMiniMap = overMMap;
						context.onFeatureHover( eventParams );						
						mostRecentHighlightEvent = eventParams;								
						dataEvent = true;
					}
					else if( selectedObject.objtype === STCJS.UTILS.OBJECT_TYPES.CYLINDER_PERIOD )
					{
						var eventParams = computeCylinderPeriodIntersection( selectedObject );
						eventParams.hoverMiniMap = overMMap;
						context.onFeatureHover( eventParams );
						mostRecentHighlightEvent = eventParams;				
						dataEvent = true;
					}

					if( doubleClicked && dataEvent )
					{
						context.onFeatureDubClick( mostRecentHighlightEvent );
						doubleClick = false;
					}								
				}
			}
			else
			{
				context.onFeatureHoverStop();
				removeTemporaryHighlights();
			}
		}
		else
		{
			context.onFeatureHoverStop();
			removeTemporaryHighlights();			
		} 
		
		render(); //context.renderer.render( context.scene, context.camera );	
	};
	
	/*
	 * 
	 */
	var removeTemporaryHighlights = function()
	{
		if( currentHighlightedLayer !== null )
		{
			currentHighlightedLayer.removeHighlight();
			currentHighlightedLayer = null;
		}
		if( tempTimeHighlight !== null )
		{
			removeCubeHighlight( tempTimeHighlight );
			tempTimeHighlight = null;
		}
	};

	/**
	 * 
	 */
	var highlightTimePeriod = function( baseTime1, baseTime2, style1, style2, drawMap )
	{
		drawMap = drawMap && !context.camera.inOrthographicMode;

		var startTime = ( baseTime1 instanceof STPoint )? baseTime1.timestamp : baseTime1;
		var endTime = ( baseTime2 instanceof STPoint )? baseTime2.timestamp : baseTime2; 
		
		var hPlanes = placePlaneHighlight( startTime, endTime, style1, style2 );
		
		highlightTimeMoment( baseTime1, style1, drawMap );
		var h1 = context.cubeData.highlights.splice( -1, 1 );
				
		highlightTimeMoment( baseTime2, style2 );
		var h2 = context.cubeData.highlights.splice( -1, 1 );
					
		var highlight = { 
			uuid: UTILS.generateUUID(),
			type: "htp", //highlight time moment
			inScene: [],
			inDom: [] 
		};
				
		highlight.inScene = highlight.inScene.concat( hPlanes );
		highlight.inScene = highlight.inScene.concat( h1[0].inScene );		
		highlight.inScene = highlight.inScene.concat( h2[0].inScene );
						
		highlight.inDom = highlight.inDom.concat( h1[0].inDom );
		highlight.inDom = highlight.inDom.concat( h2[0].inDom );
		
		context.cubeData.highlights.push( highlight );
		
		//this.renderer.render( this.scene, this.camera );
		//this.stc.refresh();
		render();
		updateTimeAxesLocation();
				
		return highlight.uuid;	
	};

	var highlightTimeMoment = function( basePoint, lineStyle, drawPlane )
	{
		drawPlane = drawPlane && !context.camera.inOrthographicMode;
		var time = ( basePoint instanceof STPoint )? basePoint.timestamp : basePoint;
				
		var highlightLines = placeTemporalAxis( time, true );				
		highlightLines.material.color = lineStyle.colour;		
		highlightLines.material.linewidth = lineStyle.lineWidth;
		highlightLines.material.opacity= lineStyle.alpha;
		highlightLines.material.transparent = true;
		highlightLines.material.needsUpdate = true;
		
		context.cubeData.timeAxesInfo.lines.splice(-1, 1);
		
		var higlightLabel = placeTemporalLabel( time, STCJS.UTILS.TIME_FLAGS.NONE, "stcTimeLabel" );
		higlightLabel.style.border = "1px solid #"+lineStyle.colour.getHexString();
		higlightLabel.htype = true;
		 
		var highlight = { 
			uuid: UTILS.generateUUID(),
			type: "htm", //highlight time moment			
			inScene: [highlightLines],
			inDom: [higlightLabel] 
		};
		
		if( basePoint instanceof STPoint )
			highlight.inScene.push( placeSpatialPositionHighlight( basePoint, lineStyle ) );
		
		if( drawPlane )
		{				
			var hplane = placeMapPlaneHighlight( time );
			highlight.inScene.push( hplane );
			if( this.stc.drawShadows ) 
			{
				var hplaneS = placeMapShadowPlaneHighlight( time );
				highlight.inScene.push( hplaneS );
			}
		}
		
		context.cubeData.highlights.push( highlight );
		
		//this.renderer.render( this.scene, this.camera );
		render();
		updateTimeAxesLocation();		
		
		return highlight.uuid;
	};

	/**
	 * 
	 */
	var placeMapPlaneHighlight = function( time )
	{
		var timeDomain = [bbox.start, bbox.end];
		var timeRange  = [context.cubeData.planeTimeNorth.position.y-context.cubeData.planeTimeNorth.scale.y/2, 
			context.cubeData.planeTimeNorth.position.y+context.cubeData.planeTimeNorth.scale.y/2];
		
		var yPos = UTILS.scaleDimension(timeDomain, timeRange, time); 
		
		var mat = context.cubeData.mapPlane.material.clone();
		mat.opacity = 1;
		mat.transparent = true;
		var mapPlane2 = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), mat);		
		mapPlane2.overdraw = true;
		mapPlane2.scale.x = context.cubeData.size.x;
		mapPlane2.scale.z = context.cubeData.size.z;
		mapPlane2.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); // rotate the plane
		mapPlane2.name = "mapPlaneHighlight";
		mapPlane2.material.needsUpdate = true;
		mapPlane2.currentRepresentedTime = time;
		mapPlane2.material.side = THREE.DoubleSide;
		
		mapPlane2.position.set( context.cubeData.pos.x, yPos, context.cubeData.pos.y );
		context.scene.add( mapPlane2 );
				
		return mapPlane2;
	};

	var placePlaneHighlight = function( startTime, endTime, style1, style2 )
	{
		var timeDomain = [bbox.start, bbox.end];
		var timeRange  = [context.cubeData.planeTimeNorth.position.y-context.cubeData.planeTimeNorth.scale.y/2, 
			context.cubeData.planeTimeNorth.position.y+context.cubeData.planeTimeNorth.scale.y/2];
		
		var yPos1 = UTILS.scaleDimension(timeDomain, timeRange, startTime);
		var yPos2 = UTILS.scaleDimension(timeDomain, timeRange, endTime);
		
		var gTexture = new THREE.Texture( UTILS.generateGradientTexture(style1.colour, style2.colour, 0.5*style1.alpha, 0.5*style2.alpha ) );
		gTexture.needsUpdate = true;		
		var planeStyle = { transparent: true, map: gTexture }; //, color: style1.colour };
				
		// back plane			
		var highlightPlaneMaterial = new THREE.MeshBasicMaterial( planeStyle );		
		var backPlaneHighlight = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), highlightPlaneMaterial );
					
		backPlaneHighlight.overdraw = true;
		backPlaneHighlight.position.set(context.cubeData.pos.x+0.05, yPos1+(yPos2-yPos1)/2, context.cubeData.pos.y-context.cubeData.size.z/2 +0.05 );
		backPlaneHighlight.scale.set( context.cubeData.size.x, yPos2-yPos1, context.cubeData.size.y);
		backPlaneHighlight.startTime = startTime;
		backPlaneHighlight.endTime = endTime;
		backPlaneHighlight.type = "back";
		
		context.scene.add( backPlaneHighlight );		
		
		// side plane					
		var sidePlaneHighlight = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), highlightPlaneMaterial ); 
		sidePlaneHighlight.overdraw = true;		
		sidePlaneHighlight.scale.set( context.cubeData.size.x, yPos2-yPos1, context.cubeData.size.z );
		sidePlaneHighlight.geometry.applyMatrix( new THREE.Matrix4().makeRotationY( Math.PI / 2 ) ); // rotate the plane
		sidePlaneHighlight.position.set( context.cubeData.pos.x +0.05 - context.cubeData.size.x/2, yPos1+(yPos2-yPos1)/2, context.cubeData.pos.z+0.05 );
		sidePlaneHighlight.startTime = startTime;
		sidePlaneHighlight.endTime = endTime;
		sidePlaneHighlight.type = "side";
		
		context.scene.add(sidePlaneHighlight);	
		
		//this.renderer.render( this.scene, this.camera );
		render();
		
		return [backPlaneHighlight, sidePlaneHighlight];
	};

	var placeMapShadowPlaneHighlight = function( time )
	{
		var timeDomain = [bbox.start, bbox.end];
		var timeRange  = [context.cubeData.planeTimeNorth.position.y-context.cubeData.planeTimeNorth.scale.y/2, 
			context.cubeData.planeTimeNorth.position.y+context.cubeData.planeTimeNorth.scale.y/2];
		
		var yPos = UTILS.scaleDimension( timeDomain, timeRange, time ); 
		
		var mat = context.cubeData.shadowPlaneDown.material;//.clone();
		//mat.map = this.stc.getDataShadowForTime( this.stc.visiblePoints, time );
		mat.opacity = 1;
		mat.transparent = true;
		var mapPlaneS = new THREE.Mesh(new THREE.PlaneBufferGeometry(1,1), mat);		
		mapPlaneS.overdraw = true;
		mapPlaneS.scale.x = context.cubeData.size.x;
		mapPlaneS.scale.z = context.cubeData.size.z;
		mapPlaneS.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) ); // rotate the plane
		mapPlaneS.name = "mapPlaneHighlightShadow";
		mapPlaneS.material.needsUpdate = true;
		mapPlaneS.currentRepresentedTime = time;
		mapPlaneS.material.side = THREE.DoubleSide;
		
		mapPlaneS.position.set( context.cubeData.pos.x, yPos+0.1, context.cubeData.pos.y );
		context.scene.add( mapPlaneS );
				
		return mapPlaneS;
	};

	var getHighCylSize = function( basePoint ){
		return Math.abs( context.stpoint2stc( basePoint ).y - (context.cubeData.pos.z-context.cubeData.size.z/2) );	
	};

	var placeSpatialPositionHighlight = function( point, style )
	{						
		var highlightLineMaterial = new THREE.MeshBasicMaterial({
			color: style.colour,
			transparent: true,
			opacity: style.alpha
		});
								
		var hlineSize = getHighCylSize( point );
		var geometry = new THREE.CylinderGeometry( Number(style.lineWidth), Number(style.lineWidth), 1, 4 );
		
		var hline = new THREE.Mesh( geometry, highlightLineMaterial );
		hline.objtype = STCJS.UTILS.OBJECT_TYPES.HCLINE;		
		var pos = context.stpoint2stc( point );
		hline.position.x = pos.x; 
		hline.position.z = pos.z;
		hline.position.y = (context.cubeData.pos.z-context.cubeData.size.z/2) + hlineSize/2;
		hline.scale.y = hlineSize;
		hline.hPoint = point;
		
		context.scene.add( hline );
		
		return hline;
	};

	var removeCubeHighlight = function( highlightUUID )
	{		
		var done = false;		
		for( var i = 0; ( i < context.cubeData.highlights.length || i < context.cubeData.spatialHighlights.length ) && !done; i++ )
		{
			if( i < context.cubeData.highlights.length && context.cubeData.highlights[i].uuid === highlightUUID  )
			{
				for( var j = 0; j < context.cubeData.highlights[i].inScene.length; j++ )
					context.scene.remove( context.cubeData.highlights[i].inScene[j] );
				for( var j = 0; j < context.cubeData.highlights[i].inDom.length; j++ )
					document.body.removeChild( context.cubeData.highlights[i].inDom[j] );
					//this.stc.container.removeChild( this.highlights[i].inDom[j] );
				context.cubeData.highlights.splice( i, 1 );
				done = true;
			}
			else if( i < context.cubeData.spatialHighlights.length && context.cubeData.spatialHighlights[i].uuid === highlightUUID )
			{
				for( var j = 0; j < context.cubeData.spatialHighlights[i].inScene.length; j++ )
					context.scene.remove( context.cubeData.spatialHighlights[i].inScene[j] );
				context.cubeData.spatialHighlights.splice( i, 1 );
				done = true;
			}
		}
			
		if( done )
		{
			render();
		}			
					
		return done;
	};

	/* */
	var computeTemporalPlaneIntersection = function( intersects, selectedIndex )
	{
		console.log("!!!!t3");
		context.onFeatureHoverStop();
		removeTemporaryHighlights();
									
		var basePoint = intersects[selectedIndex].point;
		if( !context.cubeData.invertedTime )
			var timeRange = [context.boundingBox().start, context.boundingBox().end];
		else
			var timeRange = [context.boundingBox().end, context.boundingBox().start];

		var timeDomain  = [	context.cubeData.planeTimeNorth.position.y-context.cubeData.planeTimeNorth.scale.y/2, 
							context.cubeData.planeTimeNorth.position.y+context.cubeData.planeTimeNorth.scale.y/2 ];
		var time = UTILS.scaleDimension( timeDomain, timeRange, basePoint.y );				
							
		var highlightuuid = highlightTimeMoment( time, context.timeAxisHighlightStyle, context.highlightMapPlane );
		tempTimeHighlight = highlightuuid;
		
		if( doubleClick )
		{
			var eventParams = { highlightActive: fixedPlaneHighlight === null };
			if( fixedPlaneHighlight !== null )
			{
				removeCubeHighlight( fixedPlaneHighlight );
				fixedPlaneHighlight = null;
			}
			else
			{
				fixedPlaneHighlight = highlightTimeMoment( time, context.timeAxisHighlightStyle, context.highlightMapPlane );	
				eventParams.time = time;
			}
			doubleClick = false;
			context.onTemporalHighlight( eventParams );
		}
		else
		{
			var eventParams = { time: time };
			context.onTemporalPlaneHover( eventParams );
		}
	};

	var currentSpatialHighlight = null;
	var shspoint = null;
	var ehspoint = null;

	var shbPoint = null;
	var areaSelecting = false;

	/* */
	var computeSpatialPlaneInteraction = function( intersects, index )
	{
		var areaSelect = $( "#"+context.uuid+"_select_space" ).val() == "area";

		var intersected = intersects[ (fixedPlaneHighlight !== null)? 0 : index ];
		var point = intersected.point;
		var stPointBase = context.stc2stpoint( point );
		shbPoint = stPointBase.copy();
		shbPoint.timestamp = bbox.end;

		if( doubleClick )
		{
			var eventParams = { type: (areaSelect)? "area" : "point" };
			if( currentSpatialHighlight !== null )
			{
				if( areaSelecting )
				{
					if( areaSelect )
					{
						areaSelecting = false;
						ehspoint = shbPoint;
						updateHighlightAreaPositionEndPoint( currentSpatialHighlight, shspoint, ehspoint );
						updateSpatialHighlightsPositions();
						eventParams.shPoint = shspoint;
						eventParams.ehPoint = ehspoint;
					}
				}
				else
				{
					removeCubeHighlight( currentSpatialHighlight );
					currentSpatialHighlight = null;
					shbPoint = shspoint = ehspoint = null;
				}
			}
			else
			{
				if( areaSelect )
				{
					shspoint = shbPoint;
					ehspoint = shbPoint;
					currentSpatialHighlight = highlightSpace( context.spaceHighlightStyle, shspoint, ehspoint );
					areaSelecting = true;
				}
				else
				{
					currentSpatialHighlight = highlightSpace( context.spaceHighlightStyle, stPointBase );
					eventParams.point = stPointBase;
				}
			}
			doubleClick = false;
			context.onSpatialHighlight( eventParams );
		}
		else //updateSpatialHighlightsPositions
		{
			if( currentSpatialHighlight !== null )
			{
				if( areaSelecting )
				{
					ehspoint = shbPoint;
					updateHighlightAreaPositionEndPoint( currentSpatialHighlight, shspoint, ehspoint );
					updateSpatialHighlightsPositions();
				}
			}
		}
	};

	var updateHighlightAreaPositionEndPoint = function( huuid, startPoint, endPoint )
	{
		var found = false;
		for( var i = 0; i < context.cubeData.spatialHighlights.length && !found; i++ )
		{
			if( found = (context.cubeData.spatialHighlights[i].uuid === huuid) )
			{
				if( context.cubeData.spatialHighlights[i].type === "hsp" )
				{
					context.cubeData.spatialHighlights[i].endPoint = endPoint;
					var hlineVertices = context.cubeData.spatialHighlights[i].inScene[0].geometry.vertices;
					var vertexBB = getVertexBBox( startPoint, endPoint );
					var newBB = [
						vertexBB[0], vertexBB[1], vertexBB[2], vertexBB[3], vertexBB[0],
						vertexBB[4], vertexBB[5], vertexBB[6], vertexBB[7], vertexBB[4],
						vertexBB[5], vertexBB[1], vertexBB[2], vertexBB[6], vertexBB[7], vertexBB[3] 
					];
					for( var j = 0; j < hlineVertices.length; j++ )
						hlineVertices[j] = newBB[j];
					
					context.cubeData.spatialHighlights[i].inScene[0].geometry.verticesNeedUpdate = true;
				}
			}
		}
	};

	/*
	 *
	 */
	var highlightSpace = function( style, startPoint, endPoint )
	{
		var areaHighlight = typeof endPoint !== "undefined";
		var highlight = {uuid: null};

		if( !areaHighlight )
		{
			var basePoint = startPoint.copy();
			basePoint.timestamp = bbox.end;
			var hline = placeSpatialPositionHighlight( basePoint, style );
			hline.refPoint = startPoint;

			var highlight = {
				uuid: UTILS.generateUUID(),
				typ2: "hsp", // highlight space point
				inScene: [hline]
			};
		}
		else
		{
			var vertexBB = getVertexBBox( startPoint, endPoint ); 
			var hlineMaterial = new THREE.LineBasicMaterial( {opacity: style.alpha, color: style.colour, linewidth: 1, transparent: true} );

			var hlineGeometry = new THREE.Geometry();
			hlineGeometry.vertices.push( 
				vertexBB[0], vertexBB[1], vertexBB[2], vertexBB[3], vertexBB[0],
				vertexBB[4], vertexBB[5], vertexBB[6], vertexBB[7], vertexBB[4],
				vertexBB[5], vertexBB[1], vertexBB[2], vertexBB[6], vertexBB[7], vertexBB[3] 
			);

			var hline = new THREE.Line( hlineGeometry, hlineMaterial );

			context.scene.add( hline );

			var highlight = {
				uuid: UTILS.generateUUID(),
				type: "hsp", // highlight space point
				//inScene: [hline, hline2]
				inScene: [hline],
				startPoint: startPoint,
				endPoint: endPoint
			};
		}

		context.cubeData.spatialHighlights.push( highlight );
		render();
		return highlight.uuid;
	};

	/**
	 *
	 */
	this.highlightSpatialPoint = function( stPoint, removeDefault )
	{
		if( removeDefault !== undefined || removeDefault )
			this.removeSpatialHighlight( currentSpatialHighlight );
		return highlightSpace( context.spaceHighlightStyle, stPoint );
	};
	
	/**
	 *
	 */
	this.highlightSpatialArea = function( startPoint, endPoint, removeDefault )
	{
		if( removeDefault !== undefined || removeDefault )
			this.removeSpatialHighlight( currentSpatialHighlight );
		return highlightSpace( this.spaceHighlightStyle, startPoint, endPoint );
	};

	/**
	 *
	 */
	this.removeSpatialHighlight = function( highlightUUID )
	{
		if( highlightUUID !== null )
		{
			var uuid2use = (highlightUUID == -1)? currentSpatialHighlight : highlightUUID;
			//console.log( "uuid 2 use", uuid2use );
			removeCubeHighlight( uuid2use );
			if( uuid2use == currentSpatialHighlight ) currentSpatialHighlight = null;
			shbPoint = shspoint = ehspoint = null;
		}
	};

	/*
	 * 
	 */
	var computeParticleIntersection = function( selectedObject, vertex )
	{
		var layer = layerByName( selectedObject.layer );
		if( layer === null ) return null;
		var data = layer.data;
		var particleVertex = vertex;//intersects[0].vertex;
		var dataPointIndex = selectedObject.fdpi + particleVertex;
		var dataPoint = data.points[ dataPointIndex ];
		var pointStyle = layer.stylePoints( data, dataPoint, dataPointIndex ); 
								
		var eventParams = {};
		eventParams.layer = layer;
		eventParams.type = selectedObject.objtype;
		eventParams.data = data;
		eventParams.datapointindex = dataPointIndex;
		eventParams.datapoint = dataPoint;
		eventParams.pointstyle = pointStyle;
		
		context.onFeatureHoverStop();
		var chinfo = (currentHighlightedLayer !== null)? currentHighlightedLayer.currentHighlightInfo() : null;
		
		if( chinfo == null || chinfo.feature == null || (chinfo.feature !== null && chinfo.feature.uuid !== selectedObject.uuid) || (chinfo.dataPointIndex != dataPointIndex) ){
			removeTemporaryHighlights();
			layer.highlightFeature( selectedObject, dataPointIndex, particleVertex );
		
			var time = dataPoint.timestamp;										
			var highlightuuid = highlightTimeMoment( dataPoint, new STCJS.LineStyle( { alpha: pointStyle.alpha, colour: pointStyle.colour, dashed: false } ), context.highlightMapPlane );		
			tempTimeHighlight = highlightuuid;				
			currentHighlightedLayer = layer;
		}
		
		return eventParams;
	};
	
	/*
	 * 
	 */
	var computeMeshIntersection = function( selectedObject )
	{		
		var layer = layerByName( selectedObject.layer );
		if( layer === null ) return null;
		var data = layer.data;
		var dataPointIndex = selectedObject.dpi;
		var dataPoint = data.points[ dataPointIndex ];
		var pointStyle = layer.stylePoints( data, dataPoint, dataPointIndex ); //(layer.pointstyles.length > 1 )? layer.pointstyles[ dataPointIndex ] : layer.pointstyles[0]; 
		
		var eventParams = {};
		eventParams.layer = layer;
		eventParams.type = selectedObject.objtype;
		eventParams.data = data;
		eventParams.datapointindex = dataPointIndex;
		eventParams.datapoint = dataPoint;
		eventParams.pointstyle = pointStyle;
		
		context.onFeatureHoverStop();
		removeTemporaryHighlights();		
		layer.highlightFeature( selectedObject, dataPointIndex );
		var time = dataPoint.timestamp;	
		//console.log( ">>>", pointStyle );									
		var highlightuuid = highlightTimeMoment( dataPoint, new STCJS.LineStyle( { alpha: pointStyle.alpha, colour: pointStyle.colour, dashed: false } ), context.highlightMapPlane );
		tempTimeHighlight = highlightuuid;	
		currentHighlightedLayer = layer;
		console.log( ">>>>--->>>>>>", eventParams );
		return eventParams;
	};
	
	var computeLineIntersection = function( selectedObject, point, intersects, intIndex ) // change this mess later
	{		
		var layer = layerByName( selectedObject.layer );
		if( layer === null ) return null;
		var data = layer.data;
		var dpiArray = selectedObject.geometry.attributes.dpi.array;
		
		var startLineVertex = dpiArray[ intersects[intIndex].index ];
			//selectedObject.geometry.vertices[intersects[intIndex].vertex].dpi; //intersects[0].startvertex;
		var endLineVertex = dpiArray[ intersects[intIndex].index+1 ];
			//selectedObject.geometry.vertices[intersects[intIndex].vertex+1].dpi;

		console.log( "linevertexes", intersects[intIndex].index, intersects[intIndex].index+1, startLineVertex, endLineVertex);

		var startDataPoint = data.points[ startLineVertex ];
		var endDataPoint = data.points[ endLineVertex ];
		var startLineStyle, endLineStyle;
		
		var style = layer.styleLines( data, startDataPoint, startLineVertex, endLineVertex );
		var startStyleParams = {
			alpha: style.startAlpha,
			colour: style.startColour,
			lineWidth: style.lineWidth
		};
		
		var endStyleParams = {
			alpha: style.endAlpha,
			colour: style.endColour,
			lineWidth: style.lineWidth
		};
				
		lineStyleStart = new STCJS.LineStyle( startStyleParams );
		lineStyleEnd = new STCJS.LineStyle( endStyleParams );		
		
		var eventParams = {
			type: selectedObject.objtype,
			layer: layer,
			data: data,
			startpointindex: startLineVertex,
			endpointindex: endLineVertex,
			startdatapoint: startDataPoint,
			enddatapoint: endDataPoint,
			lineStyle: style,
			//startstyle: lineStyleStart,
			//endstyle: lineStyleEnd,
			midpoint: context.stc2stpoint( point )//intersects[0].point )
			//midpoint: new STPoint( mouseevent.latLng.lat(), mouseevent.latLng.lng() )			
		};
		
		context.onFeatureHoverStop();
		removeTemporaryHighlights();
		//layer.highlightFeature( selectedObject, startLineVertex, startLineVertex, endLineVertex );
		layer.highlightFeature( selectedObject, startLineVertex, intersects[intIndex].index, intersects[intIndex].index+1 );
		var highlightuuid = highlightTimePeriod( startDataPoint, endDataPoint, lineStyleStart, lineStyleEnd, context.highlightMapPlane && !context.camera.inOrthographicMode  );
		tempTimeHighlight = highlightuuid;
		currentHighlightedLayer = layer;
		
		return eventParams;
	};
	
	var computePolyLineIntersection = function( selectedObject, intersects )
	{
		var layer = layerByName( selectedObject.layer );
		if( layer === null ) return null;
		var data = layer.data;
		var startLineVertex = selectedObject.sdpi;
		var endLineVertex = selectedObject.edpi;
		var startDataPoint = data.points[ startLineVertex ];
		var endDataPoint = data.points[ endLineVertex ];
		//var startLineStyle, endLineStyle;
		
		var polyLineStyle = layer.styleLines( data, startDataPoint, startLineVertex, endLineVertex );
		var lineStyleStart = new STCJS.LineStyle({
			colour: polyLineStyle.startColour,
			alpha: polyLineStyle.startAlpha,
			lineWidth: polyLineStyle.startLineWidth
		}); //layer.styleLines( data, startDataPoint, startLineVertex, endLineVertex );
		var lineStyleEnd = new STCJS.LineStyle({
			colour: polyLineStyle.endColour,
			alpha: polyLineStyle.endAlpha,
			lineWidth: polyLineStyle.endLineWidth
		}); //layer.styleLines( data, endDataPoint, endLineVertex, startLineVertex );
							
		var a = context.stpoint2stc( startDataPoint );
		var b = context.stpoint2stc( endDataPoint );
		var c = intersects[0].point;
		var estimatedMidPoint = STCJS.UTILS.getClosestPointTo3DLine( context, a, b, c );
			
		//trigger event				
		var eventParams = {};
		eventParams.type = selectedObject.objtype;
		eventParams.layer = layer;
		eventParams.data= data;
		eventParams.startpointindex = startLineVertex;
		eventParams.endpointindex = endLineVertex;
		eventParams.startdatapoint = startDataPoint;
		eventParams.enddatapoint = endDataPoint;
		eventParams.lineStyle = polyLineStyle;
		//eventParams.startstyle = lineStyleStart;
		//eventParams.endstyle = lineStyleEnd;		
		eventParams.colpoint = context.stc2stpoint( c );
		eventParams.midpoint = context.stc2stpoint( estimatedMidPoint );
		
		context.onFeatureHoverStop();
		removeTemporaryHighlights();
		layer.highlightFeature( selectedObject, startLineVertex, startLineVertex, endLineVertex );		
		
		var highlightuuid = highlightTimePeriod( startDataPoint, endDataPoint, lineStyleStart, lineStyleEnd, context.highlightMapPlane ); 
		tempTimeHighlight = highlightuuid;		
		
		currentHighlightedLayer = layer;
		
		return eventParams;
	};
	
	var computeCylinderPeriodIntersection = function( selectedObject )
	{
		var layer = layerByName( selectedObject.layer );
		if( layer === null ) return;
		var data = layer.data;
		var dataPointIndex = selectedObject.dpi;
		var dataPoint = data.periods[ dataPointIndex ];
		var pointStyle = layer.stylePeriods( data, dataPoint, dataPointIndex );//(layer.periodstyles.length > 1 )? layer.periodstyles[ dataPointIndex ] : layer.periodstyles[0]; 
		
		var eventParams = {};
		eventParams.layer = layer;
		eventParams.type = selectedObject.objtype;
		eventParams.data = data;
		eventParams.datapointindex = dataPointIndex;
		eventParams.datapoint = dataPoint;
		eventParams.pointstyle = pointStyle;
		
		var lineStyleStart, lineStyleEnd;
		lineStyleStart = new STCJS.LineStyle( { alpha: pointStyle.startAlpha, colour: pointStyle.startColour, lineWidth: pointStyle.startLinewidth, dashed: false } );
		lineStyleEnd = new STCJS.LineStyle( { alpha: pointStyle.endAlpha, colour: pointStyle.endColour, lineWidth: pointStyle.endLinewidth, dashed: false } );
				
		context.onFeatureHoverStop();		
		removeTemporaryHighlights();
		layer.highlightFeature( selectedObject, dataPoint );
		var sp = dataPoint.toSTPoint();
		var ep = dataPoint.toSTPoint();
		ep.timestamp = dataPoint.timestamp_end;
		
		var highlightuuid = cube.highlightTimePeriod( sp/*dataPoint.timestamp_start*/, ep/*dataPoint.timestamp_end*/, lineStyleStart, lineStyleEnd, context.highlightMapPlane );
		tempTimeHighlight = highlightuuid;				
		currentHighlightedLayer = layer;
		
		return eventParams;
	};
	
	/**
	 * 
	 */
	this.highlightData = function( data, properties ) // more options
	{
		var hlayer;
		if( (data instanceof Trajectory) || (data instanceof STPointSet) )
		{
			var props = {};
			if( properties.hasOwnProperty("stylePoints") )
				props.stylePoints = properties.stylePoints;
			if( properties.hasOwnProperty("styleLines") )
				props.styleLines = properties.styleLines;		
			
			hlayer = new STCJS.SpatioTemporalLayer( "hDataLayer", data, props );
			hlayer.additionalHighlights = [];
			hlayer.setSTC( this );
			
			if( properties.hasOwnProperty("highlightExtra") && properties.highlightExtra )
			{
				for( var i = 0; i < data.points.length; i++ )
				{
					var style = new STCJS.LineStyle({ alpha:1, colour: new THREE.Color(0xff0000), linewidth: 1 });
					if( properties.hasOwnProperty("styleLines") && properties.styleLines !== null)
						style = hlayer.styleLines( data, data.points[i], i );						
					else if( properties.hasOwnProperty("stylePoints") && properties.stylePoints !== null )
						style = hlayer.stylePoints( data, data.points[i], i );
					
					var hmap = (properties.hasOwnProperty("highlightMapPlane"))? properties.highlightMapPlane : this.highlightMapPlane;
										
					var htm = highlightTimeMoment( data.points[i], style, hmap );
					hlayer.additionalHighlights.push( htm );
				}
			}
			else if( properties.hasOwnProperty("highlightTPeriod") && properties.highlightTPeriod )
			{
				var tpStyle = (properties.hasOwnProperty("highlightTPeriodStyle"))? properties.highlightTPeriodStyle : 
					new STCJS.Style({ startColour: new THREE.Color(0xff0000), endColour: new THREE.Color(0xff0000), alpha: 1});

				var s1 = new STCJS.LineStyle({ colour: tpStyle.startColour, alpha: tpStyle.startAlpha });
				var s2 = new STCJS.LineStyle({ colour: tpStyle.endColour, alpha: tpStyle.endAlpha });

				var time1 = data.points[ 0 ].timestamp;
				var time2 = data.points[ data.points.length-1 ].timestamp;

				var htm = highlightTimePeriod( time1, time2, s1, s2, false );
				hlayer.additionalHighlights.push( htm );
			}
		}
		else if( data instanceof STPeriodSet )
		{
			var props = {};
			if( properties.hasOwnProperty("stylePeriods") )
				props.stylePeriods = properties.stylePeriods;
				
			hlayer = new STCJS.STPeriodSetLayer( "hDataLayer", data, props );
			hlayer.additionalHighlights = [];
			hlayer.setSTC( this );			
			
			if( properties.hasOwnProperty("highlightExtra") && properties.highlightExtra )
			{
				for( var i = 0; i < data.periods.length; i++ )
				{
					var style = new STCJS.LineStyle({ alpha:1, colour: new THREE.Color(0xff0000), lineWidth: 1 });
									
					if( properties.hasOwnProperty("stylePeriods") )
						style = hlayer.stylePeriods( data, data.periods[i], i );						
					
					var s1 = new STCJS.LineStyle({ alpha: style.startAlpha, colour: style.startColour, lineWidth: style.radiusBottom });
					var s2 = new STCJS.LineStyle({ alpha: style.endAlpha, colour: style.endColour, lineWidth: style.radiusTop });
					
					var p1 = data.periods[i].toSTPoint();
					var p2 = data.periods[i].toSTPoint();
					p2.setTime( data.periods[i].timestamp_end );
					
					var hmap = (properties.hasOwnProperty("highlightMapPlane"))? properties.highlightMapPlane : this.highlightMapPlane;
							
					var htm = cube.highlightTimePeriod( p1, p2, s1, s2, hmap );									
					hlayer.additionalHighlights.push( htm );					
				}
			}	
		}
		//console.log( hlayer );
		hlayer.drawLayer();
		
		this.highlightLayers.push( hlayer );
		/*updateSTC = true;
		update();*/
		this.refresh();
		
		return hlayer.uuid;	
	};
	
	/**
	 * 
	 */
	this.removeDataHighlight = function( huuid )
	{		
		var found = false;
		var i;
		for( i = 0; i < this.highlightLayers.length && !found; i++ )
		{
			found = (this.highlightLayers[i].uuid === huuid);
			if( found ) i--;
		}
		if( found )
		{
			var l2r = this.highlightLayers.splice( i, 1 )[0];		
			l2r.removeLayer();
			
			for( i = 0; i < l2r.additionalHighlights.length; i++ )
				removeCubeHighlight( l2r.additionalHighlights[i] );	
		}				
	};
	
	this.popups = [];	
	/**
	 * 
	 */
	this.popUpWindow = function( stcPoint, innerHTML )
	{
		var point2D = this.stcTo2Dpoint( stcPoint.x, stcPoint.y, stcPoint.z );
		//console.log("~~~~>>>", stcPoint, point2D );
		var div = document.createElement( "div" );
		var divID = "stcpopupwindow:"+UTILS.generateUUID();
		
		// attributes
		div.setAttribute( "id", divID );
		div.setAttribute( "name", "stcpopupwindow" );
		div.setAttribute( "title", "please?" );
		div.basePoint = stcPoint;
				
		this.container.appendChild( div );
		
		// style
		div.style.border = "2px solid black";
		div.style.borderRadius = "5px";
		div.style.backgroundColor = "white";		
		div.style.position = 'absolute';
		div.style.fontFamily = "Arial,sans-serif";		
		div.style.fontSize = "12";		
		div.style.left = point2D.x + "px";
		div.style.top = point2D.y + "px";
		div.style.zIndex = 0;
		
		// contents
		div.innerHTML =
			"<div id='"+divID+":container' style='position:relative;width:100%;height:100%;'>"+
				"<div id='"+divID+":closeLabel' style='float:right'>"+
					"<button id='"+divID+":closeButton' title='close popup' style='border-radius:50%;font-size:7;'><b>X</b></button>"+
				"</div>"+				
				"<div id='"+divID+":content' style='width:100%;height:80%;float:left;overflow:auto;'>"+
					innerHTML
				+"</div>"+
			"</div>";
		
		// events
		div.addEventListener('mousedown', 
			function()
			{ 
				if( context.controlCamera ) controls.enabled = false; 
			}, false );
		div.addEventListener('mouseover', 
			function()
			{
				if( context.controlCamera ) controls.enabled = true; 
			}, false );		
		document.getElementById(divID+":closeButton").addEventListener('click', 
			function()
			{
				if( context.controlCamera ) controls.enabled = true;
				context.container.removeChild( div );
				
				for( var i = 0; i < context.popups.length; i++ )
					if( context.popups.id === div.id )
						context.popups.splice( i, 1 ); 
							
			}, false );
		
		this.popups.push( div );
		
		return div;
	};
	
	/*
	 * 
	 */
	var updatePopUpWindows = function()
	{
		for( var i = 0; i < context.popups.length; i++ )
		{
			var stcpoint = context.popups[i].basePoint;			
			var point2D = context.stcTo2Dpoint( stcpoint.x, stcpoint.y, stcpoint.z );			
			context.popups[i].style.left = point2D.x + "px";
			context.popups[i].style.top = point2D.y + "px";
		}
	};
	
	this.onFeatureDubClick = function( event )
	{
	};

	this.onFeatureHover = function( event )
	{
		//console.log( event );
	};
	
	this.onFeatureHoverStop = function( event )
	{
	};

}


/** **************************************************************** **/
/**
 * 
 */
STCJS.Layer = function( name, data ) // styles?
{
	var context = this;
	this.name = name;
	this.data = data;
	this.visible = true;
	this.stc = null;
};

STCJS.Layer.prototype = 
{
	setSTC: function( stc )
	{
		this.stc = stc;
	},
	
	redraw: function()
	{
		this.removeLayer();
		this.drawLayer();
		this.stc.refresh();
	},
	
	switchVisibility: function()
	{
		this.visible = !this.visible;
		this.redraw();
	}
};
/** **************************************************************** **/
/**
 * 
 */
STCJS.SpatioTemporalLayer = function( name, data, properties )
{
	var context = this;
	/*
	 * 
	 */
	var defaultStylePoints = function( data, dataPoint, dataPointIndex )
	{
		return new STCJS.ParticleStyle( {size: 10, alpha: 1.0, colour: new THREE.Color(0xff0000) } );
	};
	
	/*
	 * 
	 */
	var defaultStyleLines = function( data, dataPoint, dataPointIndex, dataPointIndex2 )
	{
		var lineStyleParams = { alpha: 1, colour: new THREE.Color(0xff0000), lineWidth: 1, dashed: false };
		return new STCJS.LineStyle( lineStyleParams );
	}
	
	/*
	 * 
	 */
	var defaultStyleHighlights = function( data, dataPoint, dataPointIndex, dataPointStyle )
	{		
		return new STCJS.Style({ size: dataPointStyle.size+3, colour: new THREE.Color(0xff0000) }); 
	};
		
	this.stylePoints = ("stylePoints" in properties)? properties.stylePoints : defaultStylePoints;
	this.styleLines = ("styleLines" in properties)? properties.styleLines : defaultStyleLines;
	this.styleHighlights = ("styleHighlights" in properties)? properties.styleHighlights : defaultStyleHighlights;
	STCJS.Layer.call( this, name, data );
	this.representationObjects = [];
	
	var currentHighlight = 
	{
		feature: null,
		fid: null,
		dataPointIndex: null,
		style: null,
		hstyle: null,
		hobject: null
	};
	
	//this.OBJECT_TYPES = STCJS.UTILS.OBJECT_TYPES;
	
	this.switchVisibility = function()
	{
		this.visible = !this.visible;
		//this.redraw();
		for( var i = 0; i < this.representationObjects.length; i++ )
			this.representationObjects[i].visible = this.visible;

		this.stc.render();
	};

	/**
	 * 
	 */
	 /*
	this.getVisiblePoints = function()
	{
		var points = [];
		var cubeBB = this.stc.boundingBox();

		for( var i = 0, ln = this.data.points.length; this.visible && i < ln; i++ )
		{
			var dataPoint = this.data.points[ i ];
			//var vertex = this.stc.stpoint2stc( dataPoint );
			if( dataPoint.latitude >= cubeBB.down && dataPoint.latitude <= cubeBB.up && 
				dataPoint.longitude >= cubeBB.left && dataPoint.longitude <= cubeBB.right )
				points.push( dataPoint );
		}
		
		return points;
	};*/

	/*
	 *
	 */
	this.getRepresentationVisiblePoints = function()
	{
		var points = [];
		var cubeBB = this.stc.boundingBox();

		var inspectAndInsertDataPoint = function( dataPoint, cubeBB, points )
		{
			if( dataPoint.latitude >= cubeBB.down && dataPoint.latitude <= cubeBB.up && 
				dataPoint.longitude >= cubeBB.left && dataPoint.longitude <= cubeBB.right && $.inArray(dataPoint, points) === -1 )
				points.push( dataPoint );
			return points;
		};

		for( var i = 0; i < this.representationObjects.length; i++ )
		{
			if( this.representationObjects[i] instanceof THREE.ParticleSystem || 
				this.representationObjects[i] instanceof THREE.PointCloud ||
				this.representationObjects[i] instanceof THREE.Points )
			{
				var rpoa = this.representationObjects[i].geometry.attributes;
				for( var j = 0; j < rpoa.position.length; j+= 3 )
					points = inspectAndInsertDataPoint( this.data.points[ this.representationObjects[i].fdpi+(j/3) ], cubeBB, points );
			}
			else if( this.representationObjects[i] instanceof THREE.Line )
			{
				var rpoa = this.representationObjects[i].geometry.attributes;
				for( var j = 0; j < rpoa.dpi.length; j++ )
					points = inspectAndInsertDataPoint( this.data.points[ rpoa.dpi.array[j] ], cubeBB, points );					
			}
			else if( this.representationObjects[i].objtype === STCJS.UTILS.OBJECT_TYPES.POLYLINE )
			{				
				var sPoint = this.data.points[ this.representationObjects[i].sdpi ];
				var ePoint = this.data.points[ this.representationObjects[i].edpi ];
				points = inspectAndInsertDataPoint( sPoint, cubeBB, points );
				points = inspectAndInsertDataPoint( ePoint, cubeBB, points );
			}
			else // all others
			{
				var dpi = this.representationObjects[i].dpi;
				points = inspectAndInsertDataPoint( this.data.points[ dpi ], cubeBB, points );
			}					
		}

		return points;
	};
	
	/**
	 *
	 */
	this.drawLayer = function()
	{
		var layerObjects = [];
		if( this.visible )
		{		
			layerObjects = layerObjects.concat( createObjectPoints() );
			layerObjects = layerObjects.concat( createObjectLines() );
			this.representationObjects = layerObjects;
			//console.log( "~~>2", layerObjects );
			for( var i = 0; i < layerObjects.length; i++ )
			{
				this.stc.scene.add( layerObjects[i] );
			}
			//console.log( "lo", layerObjects );
			this.stc.refresh();			
		}
	};
	
	/**
	 * 
	 */
	this.removeLayer = function()
	{
		for( var i = 0; i < this.representationObjects.length; i++ )
			this.stc.scene.remove( this.representationObjects[i] );
		this.stc.refresh();
	};
	
	/**
	 * 
	 */
	this.updateRepresentationLocation = function()
	{
		for( var i = 0; i < this.representationObjects.length; i++ )
		{
			if( this.representationObjects[i] instanceof THREE.ParticleSystem || this.representationObjects[i] instanceof THREE.Points )
			{
				var positionArray = this.representationObjects[i].geometry.attributes.position.array;
				for( var j = 0; j < positionArray.length; j++ )
				{
					var point = this.data.points[ this.representationObjects[i].fdpi+j ];
					if( point !== undefined )
					{
						var vec =  this.stc.stpoint2stc( point );
						positionArray[ j*3 ] = vec.x;
						positionArray[ j*3 +1 ] = vec.y;
						positionArray[ j*3 +2 ] = vec.z;
					}
				}
				//this.representationObjects[i].geometry.verticesNeedUpdate = true;
				this.representationObjects[i].geometry.attributes.position.needsUpdate = true;
			}
			else if( this.representationObjects[i] instanceof THREE.Line )
			{
				var positionArray = this.representationObjects[i].geometry.attributes.position.array;
				var dpiArray = this.representationObjects[i].geometry.attributes.dpi.array;

				for( var j = 0; j < dpiArray.length; j++ )
				{
					var vec = this.stc.stpoint2stc( this.data.points[ dpiArray[j] ] );
					positionArray[ j*3 ] = vec.x;
					positionArray[ j*3 +1 ] = vec.y;
					positionArray[ j*3 +2 ] = vec.z;
				}

				this.representationObjects[i].geometry.attributes.position.needsUpdate = true;
			}
			else if( this.representationObjects[i].objtype === STCJS.UTILS.OBJECT_TYPES.POLYLINE )
			{
				var sPoint = this.data.points[ this.representationObjects[i].sdpi ];
				var ePoint = this.data.points[ this.representationObjects[i].edpi ];			
				var sVertex = this.stc.stpoint2stc( sPoint );
				var eVertex = this.stc.stpoint2stc( ePoint );
				
				this.representationObjects[i].position.x = sVertex.x;
				this.representationObjects[i].position.y = sVertex.y;
				this.representationObjects[i].position.z = sVertex.z; 
				this.representationObjects[i].lookAt( eVertex );
						
				var dist = sVertex.distanceTo( eVertex );
				this.representationObjects[i].scale.set( 1, 1, dist );
				this.representationObjects[i].translateZ( 0.5*dist );
			}
			else // all others
			{
				var dpi = this.representationObjects[i].dpi;
				var npos = this.stc.stpoint2stc( this.data.points[ dpi ] );
				this.representationObjects[i].position.x = npos.x;
				this.representationObjects[i].position.y = npos.y;
				this.representationObjects[i].position.z = npos.z;
			}					
		}
	};
	
	this.currentHighlightInfo = function(){
		return currentHighlight;
	};

	/**
	 * 
	 */
	this.removeHighlight = function()
	{
		if( currentHighlight.feature === null ) return;
		
		if( currentHighlight.hobject !== null )
		{
			this.stc.scene.remove( currentHighlight.hobject );
			currentHighlight.hobject = null;
		}
		
		if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.PARTICLE_POINT )
		{			
			//currentHighlight.feature.material.attributes.alpha.value[ currentHighlight.hobjectIndex  ] = currentHighlight.style.alpha;	
			currentHighlight.feature.geometry.attributes.alpha[ currentHighlight.hobjectIndex  ] = currentHighlight.style.alpha;	
		}
		else if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.CUBE_POINT || 
				 currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT )
		{				
			var featureMaterial = currentHighlight.feature.material;
			if( currentHighlight.style.colour !== null )
				featureMaterial.color = currentHighlight.style.colour;
			if( currentHighlight.style.opacity!== null )
				featureMaterial.opacity = currentHighlight.style.alpha;			
	
			if( currentHighlight.style.texture !== null && currentHighlight.style.texture !== undefined )
			{
				featureMaterial.map = currentHighlight.style.texture;
				featureMaterial.needsUpdate = true;	
			}			
			
			if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.CUBE_POINT )
			{				  
				currentHighlight.feature.scale.x = currentHighlight.style.x;
				currentHighlight.feature.scale.y = currentHighlight.style.y;
				currentHighlight.feature.scale.z = currentHighlight.style.z;
			}
			else if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT )
			{
				currentHighlight.feature.geometry.radius = currentHighlight.style.radius;
			}
			
		}
		else if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.LINE )
		{			
			var sStyle = currentHighlight.style;
			
			currentHighlight.feature.geometry.attributes.colour.array[ currentHighlight.vertextIndex1*3 +0] = sStyle.startColour.r;
			currentHighlight.feature.geometry.attributes.colour.array[ currentHighlight.vertextIndex1*3 +1] = sStyle.startColour.g;
			currentHighlight.feature.geometry.attributes.colour.array[ currentHighlight.vertextIndex1*3 +2] = sStyle.startColour.b;

			currentHighlight.feature.geometry.attributes.colour.array[ (currentHighlight.vertextIndex2)*3 +0] = sStyle.endColour.r;
			currentHighlight.feature.geometry.attributes.colour.array[ (currentHighlight.vertextIndex2)*3 +1] = sStyle.endColour.g;
			currentHighlight.feature.geometry.attributes.colour.array[ (currentHighlight.vertextIndex2)*3 +2] = sStyle.endColour.b;
			
			currentHighlight.feature.geometry.attributes.alpha.array[ currentHighlight.vertextIndex1 ] = sStyle.startAlpha;
			currentHighlight.feature.geometry.attributes.alpha.array[ currentHighlight.vertextIndex2+1 ] = sStyle.endAlpha;

			currentHighlight.feature.geometry.attributes.colour.needsUpdate = true;
			currentHighlight.feature.geometry.attributes.alpha.needsUpdate = true;
		}
		else if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.POLYLINE )
		{
			var sVertex = context.stc.stpoint2stc( this.data.points[ currentHighlight.dataPointIndex ] );
			var eVertex = context.stc.stpoint2stc( this.data.points[ currentHighlight.dataPointIndex2 ] );
			
			var lStyle = this.styleLines( this.data, this.data.points[ currentHighlight.dataPointIndex ], currentHighlight.dataPointIndex, currentHighlight.dataPointIndex2 );
			var sWidth = ( lStyle.startLineWidth !== null)? lStyle.startLineWidth : 1; //( hStartStyle.lineWidth !== null)? hStartStyle.lineWidth : 1;
			var eWidth = ( lStyle.endLineWidth !== null)? lStyle.endLineWidth : 1;
			var faces = 8;		
			var sColour = ( lStyle.startColour !== null)? lStyle.startColour : new THREE.Color(0xff0000);
			var eColour = ( lStyle.endColour !== null)? lStyle.endColour : new THREE.Color(0xff0000);
			var sAlpha = ( lStyle.startAlpha !== null)? lStyle.startAlpha : 1;
			var eAlpha = ( lStyle.endAlpha !== null)? lStyle.endAlpha : 1; 

			var subline = createPolyLineObject( sVertex, eVertex, sColour, eColour, sAlpha, eAlpha, sWidth, eWidth );	
			
			currentHighlight.feature.geometry.dispose();
			currentHighlight.feature.geometry = subline.geometry;
			currentHighlight.feature.geometry.attributes.colour.needsUpdate = true;
			currentHighlight.feature.geometry.attributes.alpha.needsUpdate = true;	
		}
			
		//console.log("dun dun dun!");
		currentHighlight.feature = null;
		currentHighlight.fid = null;
		currentHighlight.dataPointIndex = null;
		currentHighlight.style = null;
		currentHighlight.hstyle = null;
		currentHighlight.hobject = null;
		
		this.stc.refresh();		
	};	
	
	/**
	 * 
	 */
	this.highlightFeature = function( feature, dataPointIndex, vertexPoint, vertexPoint2 )
	{
		if( this.styleHighlights === null ) return null;		
		
		if( currentHighlight !== null && currentHighlight.feature !== null )
			if( currentHighlight.feature.uuid !== feature.uuid )
				this.removeHighlight();
			else
				return null;	

		console.log( "~~~~~>", 
			( currentHighlight.feature !== null )?
			JSON.stringify(currentHighlight.feature.uuid) : "null"
			, feature );

		var dataPoint = this.data.points[ dataPointIndex ];
		
		if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.PARTICLE_POINT )
		{		
			// #1 - adicionar particula
			var dStyle = this.stylePoints( this.data, dataPoint, dataPointIndex);
			var hStyle = this.styleHighlights( this.data, dataPoint, dataPointIndex, dStyle );
			
			var geometry = new THREE.BufferGeometry();
			var uniforms = {color: { type: "c", value: new THREE.Color( 0xffffff ) } };
			var attributes = STCJS.UTILS.createAttributesObject();		
			var hasTexture = hStyle.texture !== undefined && hStyle.texture !== null;
			if( hasTexture ) uniforms.texture = { type: "t", value: hStyle.texture };					
			
			var vertex = this.stc.stpoint2stc( dataPoint );
			//geometry.vertices.push( vertex );
			var colour2use = ( hStyle.colour !== null)? hStyle.colour: dStyle.colour;
			var alphaV = ( hStyle.alpha !== null )? hStyle.alpha : dStyle.alpha;
			var sizeV = ((hStyle.size !== null)? hStyle.size : dStyle.size );

			var positions = [];
			positions.push( vertex.x, vertex.y, vertex.z );
			var colours = [];
			colours.push( colour2use.r, colour2use.g, colour2use.b );
			var alphas = [];
			alphas.push( alphaV );
			var sizes = [];
			sizes.push( sizeV );
			//var times = [];
			//times.push( dataPoint.timestamp );

			geometry.addAttribute( 'alpha', new THREE.BufferAttribute( new Float32Array( alphas ), 1 ) );
			geometry.addAttribute( 'position', new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
			geometry.addAttribute( 'colour', new THREE.BufferAttribute( new Float32Array( colours ), 3 ) );
			geometry.addAttribute( 'size', new THREE.BufferAttribute(  new Float32Array( sizes ), 1 ) );
			//geometry.addAttribute( 'time', new THREE.BufferAttribute(  new Float32Array( times ), 1 ) );
			
			var part = createHParticleSystem( true, true, true, false, hasTexture, uniforms, attributes, geometry );
			//console.log( part );
			this.stc.scene.add( part );			
			
			currentHighlight.feature = feature;
			currentHighlight.dataPointIndex = dataPointIndex;
			currentHighlight.style = dStyle;
			currentHighlight.hstyle = hStyle;
			currentHighlight.hobject = part;
			currentHighlight.hobjectIndex = vertexPoint;
			
			/*console.log( "2~~~~~>", 
				( currentHighlight.feature !== null )?
				JSON.stringify(currentHighlight.feature.uuid) : "null"
				, feature );*/

			// #2 - tornar a particula em highlight invisivel
			//feature.material.attributes.alpha.value[ vertexPoint ] = 0;
			feature.geometry.attributes.alpha[vertexPoint] = 0;
			feature.geometry.attributes.alpha.needsUpdate = true;
			
		}
		else if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.CUBE_POINT || 
				 feature.objtype === STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT )
		{		
			if( feature.id !== currentHighlight.fid )
			{
				var pointStyle = this.stylePoints( this.data, dataPoint, dataPointIndex);
				var newStyle = this.styleHighlights( this.data, dataPoint, dataPointIndex, pointStyle );
							
				var featureMaterial = feature.material;			
				featureMaterial.color = ( newStyle.colour != null )? newStyle.colour: pointStyle.colour;
				featureMaterial.opacity = (newStyle.alpha != null)? newStyle.alpha: pointStyle.alpha;			
				if( newStyle.texture != null && newStyle.texture != undefined )
				{
					if( featureMaterial.map.sourceFile != newStyle.texture.sourceFile )
						featureMaterial.map = newStyle.texture;
				}
				featureMaterial.needsUpdate = true;
				
				if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.CUBE_POINT )
				{
					feature.scale.x = ("x" in newStyle)? newStyle.x : ( ("size" in newStyle)? newStyle.size : pointStyle.x );
					feature.scale.y = ("y" in newStyle)? newStyle.y : ( ("size" in newStyle)? newStyle.size : pointStyle.y );
					feature.scale.z = ("z" in newStyle)? newStyle.z : ( ("size" in newStyle)? newStyle.size : pointStyle.z );
				}
				else if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT )
				{
					feature.geometry.radius = ("radius" in newStyle)? newStyle.radius : pointStyle.radius;
				}
				currentHighlight.feature = feature;
				currentHighlight.fid = feature.id;
				currentHighlight.dataPointIndex = dataPointIndex;
				currentHighlight.style = pointStyle;
				currentHighlight.hstyle = newStyle;								
				currentHighlight.hobject = null;
			} 										
		}
		else if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.LINE )
		{
			var dpiArray = feature.geometry.attributes.dpi.array;
			var dataSPoint = dpiArray[vertexPoint];
			var dataEPoint = dpiArray[vertexPoint+1];
			var startDataPoint = this.data.points[ dataSPoint ];
			var endDataPoint = this.data.points[ dataEPoint ];

			var lineStyle = this.styleLines( this.data, startDataPoint, dataSPoint, dataEPoint );
			var hStyle = this.styleHighlights( this.data, startDataPoint, dataSPoint, lineStyle );
			
			var sColour = ( hStyle.startColour !== null )? hStyle.startColour: lineStyle.startColour;
			var eColour = ( hStyle.endColour !== null )? hStyle.endColour: lineStyle.endColour;

			var colourArray = feature.geometry.attributes.colour.array;
			colourArray[ vertexPoint*3 ] = sColour.r;
			colourArray[ vertexPoint*3 + 1 ] = sColour.g;
			colourArray[ vertexPoint*3 + 2 ] = sColour.b;

			colourArray[ vertexPoint2*3 ] = eColour.r;
			colourArray[ vertexPoint2*3 + 1 ] = eColour.g;
			colourArray[ vertexPoint2*3 + 2 ] = eColour.b;

			var sAlpha = ( hStyle.startAlpha !== null )? hStyle.startAlpha: lineStyle.startAlpha;
			var eAlpha = ( hStyle.endAlpha !== null )? hStyle.endAlpha: lineStyle.endAlpha;

			var alphaArray = feature.geometry.attributes.alpha.array;
			alphaArray[ vertexPoint ] = sAlpha;
			alphaArray[ vertexPoint2 ] = eAlpha;

			//feature.material.attributes.colour.needsUpdate = ( hStyle.startColour !== null  || hStyle.endColour !== null );
			feature.geometry.attributes.colour.needsUpdate = true;
			feature.geometry.attributes.alpha.needsUpdate = true;

			feature.material.needsUpdate = true;
			feature.geometry.verticesNeedUpdate = true;
			feature.geometry.dynamic = true;
			
			currentHighlight.feature = feature;
			currentHighlight.dataPointIndex = dataSPoint;//dataPointIndex; //vertexPoint;
			currentHighlight.dataPointIndex2 = dataEPoint;//dataPointIndex+1; //vertexPoint2;
			currentHighlight.style = lineStyle; //startLineStyle;
			currentHighlight.vertextIndex1 = vertexPoint;
			currentHighlight.vertextPoint2 = vertexPoint2;
			//currentHighlight.style2 = endLineStyle;
			currentHighlight.hstyle = hStyle; //hStartStyle;
			//currentHighlight.hstyle2 = hEndStyle;								
			currentHighlight.hobject = null;			
		}
		else if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.POLYLINE )
		{	
			var startDataPoint = this.data.points[ vertexPoint ];
			var endDataPoint = this.data.points[ vertexPoint2 ];
			
			var sVertex = context.stc.stpoint2stc( vertexPoint );
			var eVertex = context.stc.stpoint2stc( vertexPoint2 );

			var lStyle = this.styleLines( this.data, startDataPoint, vertexPoint, vertexPoint2 ); 
			var hlStyle = this.styleHighlights( this.data, startDataPoint, vertexPoint, lStyle ); 
			
			var sWidth = ( hlStyle.startLineWidth !== null)? hlStyle.startLineWidth : 1; //( hStartStyle.lineWidth !== null)? hStartStyle.lineWidth : 1;
			var eWidth = ( hlStyle.endLineWidth !== null)? hlStyle.endLineWidth : 1;
			var faces = 8;		
			var sColour = ( hlStyle.startColour !== null)? hlStyle.startColour : new THREE.Color(0xff0000);
			var eColour = ( hlStyle.endColour !== null)? hlStyle.endColour : new THREE.Color(0xff0000);
			var sAlpha = ( hlStyle.startAlpha !== null)? hlStyle.startAlpha : 1;
			var eAlpha = ( hlStyle.endAlpha !== null)? hlStyle.endAlpha : 1; 
				
			feature.geometry.dispose();

			var subline = createPolyLineObject( sVertex, eVertex, sColour, eColour, sAlpha, eAlpha, sWidth, eWidth );	

			feature.geometry = subline.geometry;
			
			feature.geometry.attributes.colour.needsUpdate = true;
			feature.geometry.attributes.alpha.needsUpdate = true;
			
			currentHighlight.feature = feature;
			currentHighlight.dataPointIndex = vertexPoint;
			currentHighlight.dataPointIndex2 = vertexPoint2;
			currentHighlight.style = lStyle;
			//currentHighlight.style2 = eStyle;
			currentHighlight.hstyle = hlStyle;
			//currentHighlight.hstyle2 = hEndStyle;								
			currentHighlight.hobject = null;						
		}		
				
		this.stc.refresh();	
	};
	
	var createHParticleSystem = function( useSize, useAlpha, useColour, useRotation, useTexture, uniforms, attributes, geometry )
	{
		var shaderStyleSeed = {};
		shaderStyleSeed.size = useSize;
		shaderStyleSeed.alpha = useAlpha;
		shaderStyleSeed.color = useColour;
		shaderStyleSeed.rotation = useRotation;
		if( useTexture ) shaderStyleSeed.texture = useTexture;
	
		var particleMaterial = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			//attributes: attributes,
			vertexShader: STCJS.UTILS.generateParticleVertexShader( shaderStyleSeed ),
			fragmentShader: STCJS.UTILS.generateParticleFragmentShader( shaderStyleSeed ),							 
			transparent: true,
			side: THREE.DoubleSide				
		});		
		particleMaterial.transparent = true;
		
		// rever esta parte 
		var part = new THREE.Points( geometry, particleMaterial );		
		part.dynamic = true;
		part.sortParticles = true;
		part.layer = context.name;
		part.datauuid = context.data.uuid;
		part.objtype = STCJS.UTILS.OBJECT_TYPES.H_PARTICLE_POINT;//"trajpoints"; //<----
		part.name = context.data.name+"_"+part.objtype;			
		part.display = true;
		//part.fdpi = fdpi;
		
		return part;
	};
	
	// TODO
	/*
	this.dataDrawingConstraint = function( data, dataPoint, dataIndex )
	{
		return true;
	};*/
	
	/*
	 * 
	 */
	var createObjectPoints = function()
	{
		if( context.stylePoints === null ) return [];
		var pointObjects  = [];
		
		var data = context.data;
		
		var dataPointIndex = 0;
		
		while( dataPointIndex < data.points.length )
		{
			var pointStyle = context.stylePoints( data, data.points[dataPointIndex], dataPointIndex );
			if( pointStyle !== null )
			{
				var result;
				if( pointStyle instanceof STCJS.ParticleStyle || pointStyle instanceof STCJS.PointStyle )
				{
					result = createParticlePoints( data, dataPointIndex );											
				}
				else if( pointStyle instanceof STCJS.CubeStyle )
				{
					result = createCubePoints( data, dataPointIndex );								
				}
				else if( pointStyle instanceof STCJS.SphereStyle )
				{				
					result = createSpherePoints( data, dataPointIndex );
				}
				pointObjects = pointObjects.concat( result.objs );
				dataPointIndex = result.dpi;			
			}
			else
				dataPointIndex++;					
		}
		
		console.log( "po >>>", pointObjects );
		return pointObjects;	
	};
	
	/*
	 * 
	 */
	var createObjectLines = function()
	{
		if( context.styleLines === null || context.data.points.length <= 1 ) return [];
		//if( context.linestyles === null ) return [];
		
		lineObjects = [];
		
		var data = context.data;
		//var lstyles = context.linestyles;
			
		var dataPointIndex = lineStyleIndex = 0;
		
		while( dataPointIndex < data.points.length )
		{
			//var lineStyle = lstyles[ lineStyleIndex ];			
			var lineStyle = context.styleLines( data, data.points[dataPointIndex], dataPointIndex, dataPointIndex+1 );//pstyles[pointStyleIndex];
			if( lineStyle !== null )	
			{
				var result;
				if( lineStyle instanceof STCJS.PolyLineStyle )
				{				
					result = createPolyLines( data, dataPointIndex/*, lstyles, lineStyleIndex*/ );				
				}
				else if( lineStyle instanceof STCJS.LineStyle || lineStyle instanceof STCJS.Style )
				{				
					result = createNormalLines( data, dataPointIndex/*, lstyles, lineStyleIndex */); // HERE								
				}
				lineObjects = lineObjects.concat( result.objs );
				dataPointIndex = result.dpi;
				//lineStyleIndex = result.spi;
			}
			else
				dataPointIndex++;		
		}
		console.log(">>>>>", lineObjects);
		return lineObjects;
	};
	
	var setFaceRGBA3 = function( colourHolder, alphaHolder, baseIndex, colour, alpha )
	{
		colourHolder[ baseIndex + 0 ] = colour.r;
		colourHolder[ baseIndex + 1 ] = colour.g;
		colourHolder[ baseIndex + 2 ] = colour.b;

		for( var i = 0; i < 3; i++ )
			alphaHolder[ baseIndex + i ] = alpha;
	};

	var setFaceRGBA9 = function( colourHolder, alphaHolder, baseIndex, colour, alpha )
	{
		colourHolder[ baseIndex + 0 ] = colour.r;
		colourHolder[ baseIndex + 1 ] = colour.g;
		colourHolder[ baseIndex + 2 ] = colour.b;
		colourHolder[ baseIndex + 3 ] = colour.r;
		colourHolder[ baseIndex + 4 ] = colour.g;
		colourHolder[ baseIndex + 5 ] = colour.b;
		colourHolder[ baseIndex + 6 ] = colour.r;
		colourHolder[ baseIndex + 7 ] = colour.g;
		colourHolder[ baseIndex + 8 ] = colour.b;

		for( var i = 0; i < 9; i++ )
			alphaHolder[ baseIndex + i ] = alpha;
	};

	var setFaceRGBAT3 = function( timeHolder, colourHolder, alphaHolder, baseIndex, time, colour, alpha )
	{
		colourHolder[ baseIndex + 0 ] = colour.r;
		colourHolder[ baseIndex + 1 ] = colour.g;
		colourHolder[ baseIndex + 2 ] = colour.b;

		for( var i = 0; i < 3; i++ ){
			alphaHolder[ baseIndex + i ] = alpha;
			timeHolder[baseIndex + i ] = time;
		}
	};

	var setFaceRGBAT9 = function( timeHolder, colourHolder, alphaHolder, baseIndex, time, colour, alpha )
	{
		colourHolder[ baseIndex + 0 ] = colour.r;
		colourHolder[ baseIndex + 1 ] = colour.g;
		colourHolder[ baseIndex + 2 ] = colour.b;
		colourHolder[ baseIndex + 3 ] = colour.r;
		colourHolder[ baseIndex + 4 ] = colour.g;
		colourHolder[ baseIndex + 5 ] = colour.b;
		colourHolder[ baseIndex + 6 ] = colour.r;
		colourHolder[ baseIndex + 7 ] = colour.g;
		colourHolder[ baseIndex + 8 ] = colour.b;

		for( var i = 0; i < 9; i++ ){
			alphaHolder[ baseIndex + i ] = alpha;
			timeHolder[baseIndex + i ] = time;
		}
	};

	var createPolyLineObject = function( sVertex, eVertex, sColour, eColour, sAlpha, eAlpha, sWidth, eWidth, sTime, eTime ){
		var uniforms = {
			color:     { type: "c", value: new THREE.Color( 0xffffff ) },
			tfocus: context.stc.stcUniforms.tfocus,
			tstart: context.stc.stcUniforms.tstart,
			tend: context.stc.stcUniforms.tend
		};
		var geo = new THREE.CylinderGeometry( sWidth, eWidth, 1, 8 );
		geo.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / -2 ) );
		
		var positions 	= new Float32Array( geo.faces.length * 3 * 3 );
		var colours 	= new Float32Array( geo.faces.length * 3 * 3 );
		var alphas 		= new Float32Array(  geo.faces.length * 3 * 3 );
		var times 		= new Float32Array(  geo.faces.length * 3 * 3 );
		
		for( var i = 0; i < geo.faces.length; i++ )
		{	
			positions[ i * 9 + 0 ] = geo.vertices[ geo.faces[i].a ].x;
			positions[ i * 9 + 1 ] = geo.vertices[ geo.faces[i].a ].y;
			positions[ i * 9 + 2 ] = geo.vertices[ geo.faces[i].a ].z;
			positions[ i * 9 + 3 ] = geo.vertices[ geo.faces[i].b ].x;
			positions[ i * 9 + 4 ] = geo.vertices[ geo.faces[i].b ].y;
			positions[ i * 9 + 5 ] = geo.vertices[ geo.faces[i].b ].z;
			positions[ i * 9 + 6 ] = geo.vertices[ geo.faces[i].c ].x;
			positions[ i * 9 + 7 ] = geo.vertices[ geo.faces[i].c ].y;
			positions[ i * 9 + 8 ] = geo.vertices[ geo.faces[i].c ].z;		

			if( i >= geo.faces.length/2 )
			{
				if( i >= geo.faces.length/2 + geo.faces.length/4 )
					setFaceRGBAT9( times, colours, alphas, i*9, eTime, eColour, eAlpha );	
				else
					setFaceRGBAT9( times, colours, alphas, i*9, sTime, sColour, sAlpha );
			}
			else if( i % 2 == 0 ) 
			{
				setFaceRGBAT3( times, colours, alphas, i*9, sTime, sColour, sAlpha );
				setFaceRGBAT3( times, colours, alphas, i*9+3, eTime, eColour, eAlpha );
				setFaceRGBAT3( times, colours, alphas, i*9+6, sTime, sColour, sAlpha );
			}
			else
			{
				setFaceRGBAT3( times, colours, alphas, i*9, eTime, eColour, eAlpha );
				setFaceRGBAT3( times, colours, alphas, i*9+3, eTime, eColour, eAlpha );
				setFaceRGBAT3( times, colours, alphas, i*9+6, sTime, sColour, sAlpha );
			}
		}

		var geometry = new THREE.BufferGeometry().fromGeometry(geo);
		geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		geometry.addAttribute( 'colour', new THREE.BufferAttribute( colours, 3 ) );
		geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 3 ) );
		geometry.addAttribute( 'time', new THREE.BufferAttribute( times, 3 ) );
		geometry.removeAttribute( 'color' );

		var shaderStyleSeed = {};
		shaderStyleSeed.alpha = true;
		shaderStyleSeed.color = true;
				
		var material = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: STCJS.UTILS.generateLineVertexShader( shaderStyleSeed ),
			fragmentShader: STCJS.UTILS.generateLineFragmentShader( shaderStyleSeed ),
			transparent: true
		});		
					
		var subline = new THREE.Mesh( geometry, material );
		subline.castShadow = true;
		subline.position.x = sVertex.x;
		subline.position.y = sVertex.y;
		subline.position.z = sVertex.z;
		subline.lookAt( eVertex );

		var dist = sVertex.distanceTo( eVertex );
		subline.scale.set( 1, 1, dist );
		subline.translateZ( 0.5*dist );
		subline.overdraw = true;

		return subline;
	};

	var createPolyLines = function( data, dataPointIndex )
	{
		var polyLinesObjects = [];
		var sStyle = context.styleLines( data, data.points[dataPointIndex], dataPointIndex, dataPointIndex+1 );//pstyles[pointStyleIndex];
		while( (sStyle instanceof STCJS.PolyLineStyle) && (dataPointIndex < data.points.length-1) )
		{
			/*var uniforms = {
				color:     { type: "c", value: new THREE.Color( 0xffffff ) },
				tfocus: context.stc.stcUniforms.tfocus,
				tstart: context.stc.stcUniforms.tstart,
				tend: context.stc.stcUniforms.tend
			};*/

			var attributes = {
				alpha: {type: "f", value: [] },
				colour: {type:"c", value: [] }
			};

			var sPoint = data.points[ dataPointIndex ];
			var ePoint = data.points[ dataPointIndex+1 ];
			var sVertex = context.stc.stpoint2stc( sPoint );
			var eVertex = context.stc.stpoint2stc( ePoint );
			
			sStyle = context.styleLines( data, data.points[dataPointIndex], dataPointIndex, dataPointIndex+1 );//pstyles[pointStyleIndex];

			if( sStyle !== null ) //&& eStyle !== null )
			{
				var sWidth = ( sStyle.startLineWidth != null)? sStyle.startLineWidth : 1;
				var eWidth = ( sStyle.endLineWidth != null)? sStyle.endLineWidth : 1;
				var faces = 8;		
				var sColour = (sStyle.startColour != null)? sStyle.startColour : new THREE.Color(0xff0000);
				var eColour = (sStyle.endColour != null)? sStyle.endColour : new THREE.Color(0xff0000);
				var sAlpha = (sStyle.startAlpha != null)? sStyle.startAlpha : 1;
				var eAlpha = (sStyle.endAlpha != null)? sStyle.endAlpha : 1; 
				
				var subline = createPolyLineObject( sVertex, eVertex, sColour, eColour, sAlpha, eAlpha, sWidth, eWidth, data.points[dataPointIndex].timestamp, data.points[dataPointIndex+1].timestamp );
				
				subline.layer = context.name;
				subline.objtype = STCJS.UTILS.OBJECT_TYPES.POLYLINE;
				subline.name = data.name+"_"+subline.objtype;
				subline.datauuid = data.uuid;
				subline.sdpi = dataPointIndex;
				subline.edpi = dataPointIndex+1;
				subline.display = true;
				polyLinesObjects.push( subline );
			}			
			
			dataPointIndex ++;
		}
	
		return { objs: polyLinesObjects, dpi: (dataPointIndex == data.points.length-1)? dataPointIndex+1 : dataPointIndex/*, spi: lineStyleIndex*/ };
	};
	

	/*
	 *
	 */
	var insertVertexInfo = function( vertex, style, dpi, dataPointIndexes, positions, colours, alphas, lDistances, lTotalSizes, lDashSizes, preVertex, hadDashed, startS ){
		
		dataPointIndexes.push( dpi );
		positions.push( vertex.x, vertex.y, vertex.z );
		var c, a;
		if( startS )
		{
			c = (style.startColour !== null)? style.startColour : new THREE.Color(0xff0000);
			a = (style.startAlpha !== null)? style.startAlpha : 1;		
		}
		else
		{
			c = (style.startColour !== null)? style.endColour : new THREE.Color(0xff0000);
			a = (style.startAlpha !== null)? style.endAlpha : 1;			
		}

		colours.push( c.r, c.g, c.b );
		alphas.push( a );
		var distance = (preVertex !== null)? vertex.distanceTo( preVertex ) : 0;

		if( style.dashedLine )
		{
			hadDashed = true;				
			var gapSize = ( "gapSize" in style && style.gapSize !== null )? style.gapSize: 1;
			var dashSize = ("dashSize" in style && style.dashSize !== null )? style.dashSize: 1;
			lTotalSizes.push( dashSize+gapSize );
			lDashSizes.push( dashSize );
		}
		else if( hadDashed )
		{
			lTotalSizes.push( distance );
			lDashSizes.push( distance );
		}

		if( preVertex !== null ) lDistances.push( distance );

		return hadDashed;
	};

	/*
	 * 
	 */
	var createNormalLines = function( data, dataPointIndex )
	{
		var lineObjects = [];
		var uniforms = {
			color:     { type: "c", value: new THREE.Color( 0xffffff ) },
			tfocus: context.stc.stcUniforms.tfocus,
			tstart: context.stc.stcUniforms.tstart,
			tend: context.stc.stcUniforms.tend
		};

		var hadDashed = false;
		var hasLineWidth = false;
		var mostRecentLineWidth = 1;
			
		var geometry = new THREE.BufferGeometry();
		var style = context.styleLines( data, data.points[dataPointIndex], dataPointIndex, dataPointIndex+1 );//pstyles[pointStyleIndex];
		var lastStyle = style;
		var attributeIndex = 0;	
		
		var positions = [];
		var sizes = [];
		var alphas = [];
		var colours = [];
		var dataPointIndexes = [];
		var lDistances = [];
		var lDashSizes = [];
		var lTotalSizes = [];
		var times = [];

		var preVertex = null;

		while(  (dataPointIndex < data.points.length-1) && 
				style !== null && ((style instanceof STCJS.LineStyle) || (style instanceof STCJS.Style)) )
		{
			// needs compensation
			var needsCompensation = 
				(attributeIndex == 0 || 
					(style.startAlpha !== lastStyle.endAlpha || style.startColour.getHex() !== lastStyle.endColour.getHex()));
						
			if( needsCompensation )
			{
				var point1 = data.points[dataPointIndex];
				var vertex1 = context.stc.stpoint2stc( point1 );
				//vertex1.dpi = dataPointIndex;
				hadDashed = insertVertexInfo( vertex1, style, dataPointIndex, dataPointIndexes, positions, colours, alphas, lDistances, lTotalSizes, lDashSizes, preVertex, hadDashed, true );
				times.push( point1.timestamp );
				preVertex = vertex1;			
			}
			
			var point2 = data.points[dataPointIndex+1];
			var vertex2 = context.stc.stpoint2stc( point2 );
			hadDashed = insertVertexInfo( vertex2, style, dataPointIndex+1, dataPointIndexes, positions, colours, alphas, lDistances, lTotalSizes, lDashSizes, preVertex, hadDashed, false );
			preVertex = vertex2;
			times.push( point2.timestamp );
			
			if( style.lineWidth !== null )
			{
				hasLineWidth = true;
				mostRecentLineWidth = style.lineWidth;
			}
			
			lastStyle = style;
			dataPointIndex++;
			attributeIndex+=2;
			
			if( dataPointIndex < data.points.length-1 )
				style = context.styleLines( data, data.points[dataPointIndex], dataPointIndex, dataPointIndex+1 );
			else
				dataPointIndex ++;

		}
		
		var shaderStyleSeed = { alpha : true, color: true, dashed: hadDashed };
					
		if( hadDashed )	lDistances.push(0); // because it needs to 

		if( hadDashed )
		{
			geometry.addAttribute( 'totalSize',  new THREE.BufferAttribute( new Float32Array( lTotalSizes ), 1 ) );
			geometry.addAttribute( 'dashSize',  new THREE.BufferAttribute( new Float32Array( lDashSizes ), 1 ) );
			geometry.addAttribute( 'lineDistance',  new THREE.BufferAttribute( new Float32Array( lDistances ), 1 ) );	
		}
		geometry.addAttribute( 'position',  new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
		geometry.addAttribute( 'colour',  new THREE.BufferAttribute( new Float32Array( colours ), 3 ) );
		geometry.addAttribute( 'alpha',  new THREE.BufferAttribute( new Float32Array( alphas ), 1 ) );
		geometry.addAttribute( 'dpi',  new THREE.BufferAttribute( new Float32Array( dataPointIndexes ), 1 ) );
		geometry.addAttribute( 'time',  new THREE.BufferAttribute( new Float32Array( times ), 1 ) );

		var linesMaterial = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: STCJS.UTILS.generateLineVertexShader( shaderStyleSeed ),
			fragmentShader: STCJS.UTILS.generateLineFragmentShader( shaderStyleSeed ),			
			transparent: true			
		});
											
		linesMaterial.linewidth = mostRecentLineWidth;		
		
		var line = new THREE.Line( geometry, linesMaterial );//new THREE.LineBasicMaterial({color: 0x0000ff }) ); 
		line.layer = context.name;
		line.objtype = STCJS.UTILS.OBJECT_TYPES.LINE;
		line.name = context.data.name+"_"+line.objtype;		
		line.display = true;
		line.datauuid = data.uuid;
		line.verticesNeedUpdate = true;
		lineObjects.push(line);

		return { objs: lineObjects, dpi: dataPointIndex };	
	};
	
	/*
	 * 
	 */
	var createSpherePoints = function( data, pointIndex )
	{
		var sphereObjects = [];
		var style = context.stylePoints(data, data.points[pointIndex], pointIndex ); 
		
		while( style !== null && (style instanceof STCJS.SphereStyle) && pointIndex < data.points.length )
		{
			var point = data.points[pointIndex];
			var vertex = context.stc.stpoint2stc( point );
			
			style = context.stylePoints(data, data.points[pointIndex], pointIndex );
			
			if( style instanceof STCJS.SphereStyle )
			{
				/*var materialProperties = {};
				materialProperties.transparent = true;			
				materialProperties.color = ( style.colour != null )? style.colour: 0xff0000;
				materialProperties.opacity = (style.alpha != null)? style.alpha: 1;			
				
				if( style.texture != null && style.texture != undefined ) materialProperties.map = style.texture;
				var pointRadius = style.radius;
				
				var pointMaterial = new THREE.MeshBasicMaterial( materialProperties );
				var sphere = new THREE.Mesh(new THREE.SphereGeometry( pointRadius, 8, 8), pointMaterial );
				sphere.overdraw = true;
				sphere.layer = context.name;
				sphere.objtype = STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT;
				sphere.datauuid = context.data.uuid;
				sphere.dpi = pointIndex;
				sphere.name = context.data.name+"_"+sphere.objtype;
				sphere.position.x = vertex.x;
				sphere.position.y = vertex.y;
				sphere.position.z = vertex.z;
				sphere.display = true;*/

				var sphere = createSpherePoint( data, pointIndex, vertex, style, point.timestamp );				
				sphereObjects.push( sphere);			
				//if( styles.length > 1 ) styleIndex ++;
				pointIndex ++;
			}			  
		}
		
		return { objs: sphereObjects, dpi: pointIndex/*, spi: styleIndex*/ };
	};

	/* */
	var createSpherePoint = function( data, pointIndex, vertex, style, time )
	{
		var uniforms = {
			color:     { type: "c", value: new THREE.Color( 0xffffff ) },
			tfocus: context.stc.stcUniforms.tfocus,
			tstart: context.stc.stcUniforms.tstart,
			tend: context.stc.stcUniforms.tend
		};
		var texture = style.texture;
		var colour = style.colour;
		var alpha = style.alpha;
		var radius = style.radius;

		if( texture !== null ) uniforms.texture = { type: "t", value: texture };

		var geo = new THREE.SphereGeometry( radius, 8, 8); //size.x, size.y, size.z );

		var positions 	= new Float32Array( geo.faces.length * 3 * 3 );
		var colours 	= new Float32Array( geo.faces.length * 3 * 3 );
		var alphas 		= new Float32Array(  geo.faces.length * 3 * 3 );
		var times 		= new Float32Array(  geo.faces.length * 3 * 3 );

		for( var i = 0; i < geo.faces.length; i++ )
		{	
			positions[ i * 9 + 0 ] = geo.vertices[ geo.faces[i].a ].x;
			positions[ i * 9 + 1 ] = geo.vertices[ geo.faces[i].a ].y;
			positions[ i * 9 + 2 ] = geo.vertices[ geo.faces[i].a ].z;
			positions[ i * 9 + 3 ] = geo.vertices[ geo.faces[i].b ].x;
			positions[ i * 9 + 4 ] = geo.vertices[ geo.faces[i].b ].y;
			positions[ i * 9 + 5 ] = geo.vertices[ geo.faces[i].b ].z;
			positions[ i * 9 + 6 ] = geo.vertices[ geo.faces[i].c ].x;
			positions[ i * 9 + 7 ] = geo.vertices[ geo.faces[i].c ].y;
			positions[ i * 9 + 8 ] = geo.vertices[ geo.faces[i].c ].z;		

			setFaceRGBA9( colours, alphas, i*9, colour, alpha );

			times[ i * 9 + 0 ] = time;
			times[ i * 9 + 1 ] = time;
			times[ i * 9 + 2 ] = time;
			times[ i * 9 + 3 ] = time;
			times[ i * 9 + 4 ] = time;
			times[ i * 9 + 5 ] = time;
			times[ i * 9 + 6 ] = time;
			times[ i * 9 + 7 ] = time;
			times[ i * 9 + 8 ] = time;
		}

		var geometry = new THREE.BufferGeometry().fromGeometry(geo);
		geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		geometry.addAttribute( 'colour', new THREE.BufferAttribute( colours, 3 ) );
		geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 3 ) );
		geometry.addAttribute( 'time', new THREE.BufferAttribute( times, 3 ) );
		geometry.removeAttribute( 'color' );

		var shaderStyleSeed = {};
		shaderStyleSeed.alpha = true;
		shaderStyleSeed.color = true;
		shaderStyleSeed.texture = texture !== null;
				
		var material = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: STCJS.UTILS.generateLineVertexShader( shaderStyleSeed ),
			fragmentShader: STCJS.UTILS.generateLineFragmentShader( shaderStyleSeed ),
			transparent: true
		});

		var sphere = new THREE.Mesh( geometry, material );
		sphere.overdraw = true;
		sphere.layer = context.name;
		sphere.objtype = STCJS.UTILS.OBJECT_TYPES.SPHERE_POINT;
		sphere.datauuid = context.data.uuid;
		sphere.dpi = pointIndex;
		sphere.name = context.data.name+"_"+sphere.objtype;
		sphere.position.x = vertex.x;
		sphere.position.y = vertex.y;
		sphere.position.z = vertex.z;
		sphere.display = true;

		return sphere;
	};
	
	/*
	 * 
	 */
	var createCubePoints = function( data, pointIndex /*, styles, styleIndex*/ )
	{
		var cubeObjects = [];
		var style = context.stylePoints(data, data.points[pointIndex], pointIndex );
		
		while( style !== null && (style instanceof STCJS.CubeStyle) && pointIndex < data.points.length )
		{
			var point = data.points[pointIndex];
			var vertex = context.stc.stpoint2stc( point );
			
			//var style = styles[styleIndex];
			style = context.stylePoints(data, data.points[pointIndex], pointIndex );
			
			if( style instanceof STCJS.CubeStyle )
			{
				var cube = createCubePoint( data, pointIndex, vertex, style.colour, style.alpha, style, style.texture, point.timestamp );
				cubeObjects.push( cube );				
				
				//if( styles.length > 1 ) styleIndex ++;
				pointIndex ++;
			}			  
		}		
		return { objs: cubeObjects, dpi: pointIndex/*, spi: styleIndex*/ };
	};

	var createCubePoint = function( data, pointIndex, vertex, colour, alpha, size, texture, time )
	{
		var uniforms = {
			color:     { type: "c", value: new THREE.Color( 0xffffff ) },
			tfocus: context.stc.stcUniforms.tfocus,
			tstart: context.stc.stcUniforms.tstart,
			tend: context.stc.stcUniforms.tend
		};

		if( texture !== null ) uniforms.texture = { type: "t", value: texture };

		var geo = new THREE.BoxGeometry( 1,1,1 ); //size.x, size.y, size.z );

		var positions 	= new Float32Array( geo.faces.length * 3 * 3 );
		var colours 	= new Float32Array( geo.faces.length * 3 * 3 );
		var alphas 		= new Float32Array(  geo.faces.length * 3 * 3 );
		var times 		= new Float32Array(  geo.faces.length * 3 * 3 );

		for( var i = 0; i < geo.faces.length; i++ )
		{	
			positions[ i * 9 + 0 ] = geo.vertices[ geo.faces[i].a ].x;
			positions[ i * 9 + 1 ] = geo.vertices[ geo.faces[i].a ].y;
			positions[ i * 9 + 2 ] = geo.vertices[ geo.faces[i].a ].z;
			positions[ i * 9 + 3 ] = geo.vertices[ geo.faces[i].b ].x;
			positions[ i * 9 + 4 ] = geo.vertices[ geo.faces[i].b ].y;
			positions[ i * 9 + 5 ] = geo.vertices[ geo.faces[i].b ].z;
			positions[ i * 9 + 6 ] = geo.vertices[ geo.faces[i].c ].x;
			positions[ i * 9 + 7 ] = geo.vertices[ geo.faces[i].c ].y;
			positions[ i * 9 + 8 ] = geo.vertices[ geo.faces[i].c ].z;		

			setFaceRGBA9( colours, alphas, i*9, colour, alpha );

			times[ i * 9 + 0 ] = time;
			times[ i * 9 + 1 ] = time;
			times[ i * 9 + 2 ] = time;
			times[ i * 9 + 3 ] = time;
			times[ i * 9 + 4 ] = time;
			times[ i * 9 + 5 ] = time;
			times[ i * 9 + 6 ] = time;
			times[ i * 9 + 7 ] = time;
			times[ i * 9 + 8 ] = time;
		}

		var geometry = new THREE.BufferGeometry().fromGeometry(geo);
		geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
		geometry.addAttribute( 'colour', new THREE.BufferAttribute( colours, 3 ) );
		geometry.addAttribute( 'alpha', new THREE.BufferAttribute( alphas, 3 ) );
		geometry.addAttribute( 'time', new THREE.BufferAttribute( times, 3 ) );
		geometry.removeAttribute( 'color' );

		var shaderStyleSeed = {};
		shaderStyleSeed.alpha = true;
		shaderStyleSeed.color = true;
		shaderStyleSeed.texture = texture !== null;
				
		var material = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: STCJS.UTILS.generateLineVertexShader( shaderStyleSeed ),
			fragmentShader: STCJS.UTILS.generateLineFragmentShader( shaderStyleSeed ),
			transparent: true
		});

		var cube = new THREE.Mesh( geometry, material );
		cube.scale.x = size.x;
		cube.scale.y = size.y;
		cube.scale.z = size.z;
		cube.overdraw = true;
		cube.objtype = STCJS.UTILS.OBJECT_TYPES.CUBE_POINT;
		cube.datauuid = data.uuid;
		cube.layer = context.name;
		cube.dpi = pointIndex;
		cube.name = context.data.name+"_"+cube.objtype;
		cube.position.x = vertex.x;
		cube.position.y = vertex.y;
		cube.position.z = vertex.z;
		cube.display = true;

		return cube;
	};
	
	/*
	 * 
	 */
	var createParticlePoints = function( data, pointIndex /*, styles, styleIndex*/ )
	{
		// ---
		var createParticleSystem = function( useSize, useAlpha, useColour, useRotation, useTexture, uniforms, attributes, geometry, fdpi )
		{
			var shaderStyleSeed = {};
			shaderStyleSeed.size = useSize;
			shaderStyleSeed.alpha = useAlpha;
			shaderStyleSeed.color = useColour;
			shaderStyleSeed.rotation = useRotation;
			if( useTexture ) shaderStyleSeed.texture = useTexture;
		
			var particleMaterial = new THREE.ShaderMaterial( {
				uniforms: uniforms,
				//attributes: attributes,
				vertexShader: STCJS.UTILS.generateParticleVertexShader( shaderStyleSeed ),
				fragmentShader: STCJS.UTILS.generateParticleFragmentShader( shaderStyleSeed ),							 
				transparent: true,
				side: THREE.DoubleSide				
			});		
			//particleMaterial.transparent = true;
			
			// rever esta parte 
			var part = new THREE.Points( geometry, particleMaterial );		
			part.castShadow = true;
			part.dynamic = true;
			part.sortParticles = true;
			part.layer = context.name;
			part.datauuid = context.data.uuid;
			part.objtype = STCJS.UTILS.OBJECT_TYPES.PARTICLE_POINT;//"trajpoints";
			part.name = context.data.name+"_"+part.objtype;			
			part.display = true;
			part.fdpi = fdpi;
			
			return part;
		};
		
		var style = context.stylePoints(data, data.points[pointIndex], pointIndex );
		var particleObjects = [];
		
		var geometry, uniforms, attributes, hasTexture, fdpi; 
		var createNew = true;
		var lastTexture = null;

		var positions;
		var sizes;
		var colours;
		var alphas;
		var times;
			
		while( style !== null && ((style instanceof STCJS.ParticleStyle) || (style instanceof STCJS.PointStyle)) && pointIndex < data.points.length )
		{			
			style = context.stylePoints(data, data.points[pointIndex], pointIndex );
			
			if( style !== null )
			{
				if( style.texture !== undefined && style.texture !== null )
				{
					if( lastTexture !== null && style.texture.sourceFile !== lastTexture.sourceFile )
					{
						geometry.addAttribute( 'size',  new THREE.BufferAttribute( new Float32Array( sizes ), 1 ) );
						geometry.addAttribute( 'position',  new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
						geometry.addAttribute( 'colour',  new THREE.BufferAttribute( new Float32Array( colours ), 3 ) );
						geometry.addAttribute( 'alpha',  new THREE.BufferAttribute( new Float32Array( alphas ), 3 ) );
						geometry.addAttribute( 'time',  new THREE.BufferAttribute( new Float32Array( times ), 3 ) );

						var part = createParticleSystem( true, true, true, true, hasTexture, uniforms, attributes, geometry, fdpi );
						createNew = true;						
						//pointIndex --;					
						particleObjects.push( part );
					}	
					hasTexture = true;
					lastTexture = style.texture;
				}	
			}
			else
				createNew = true;
				
				
			if( style !== null && createNew )
			{
				geometry = new THREE.BufferGeometry();
				uniforms = {
					color: { type: "c", value: new THREE.Color( 0xffffff ) },
					tfocus: context.stc.stcUniforms.tfocus,
					tstart: context.stc.stcUniforms.tstart,
					tend: context.stc.stcUniforms.tend
				};
				if( hasTexture )
					uniforms.texture = { type: "t", value: style.texture };
				
				positions = [];
				colours = [];
				alphas = [];
				sizes = [];
				times = [];
				fdpi = pointIndex;
				createNew = false; 
			}		
											
			if( style !== null )
			{
				var point = data.points[ pointIndex ];
				var vertex = context.stc.stpoint2stc( point );
				positions.push( vertex.x, vertex.y, vertex.z );
				var c = ( style.colour != null)? style.colour: new THREE.Color(0xff0000);
				colours.push( c.r, c.g, c.b );
				var a = ( style.alpha != null )? style.alpha : 1.0;
				alphas.push( a, a, a );
				var s = ( style.size != null )? style.size : 3;
				sizes.push( s );//,s,s );
				times.push( point.timestamp, point.timestamp, point.timestamp );
			}
			//if( styles.length > 1 ) styleIndex ++;
			pointIndex ++;
		}
		
		geometry.addAttribute( 'size',  new THREE.BufferAttribute( new Float32Array( sizes ), 1 ) );
		geometry.addAttribute( 'position',  new THREE.BufferAttribute( new Float32Array( positions ), 3 ) );
		geometry.addAttribute( 'colour',  new THREE.BufferAttribute( new Float32Array( colours ), 3 ) );
		geometry.addAttribute( 'alpha',  new THREE.BufferAttribute( new Float32Array( alphas ), 3 ) );
		geometry.addAttribute( 'time',  new THREE.BufferAttribute( new Float32Array( times ), 3 ) );

		var part = createParticleSystem( true, true, true, true, hasTexture, uniforms, attributes, geometry, fdpi );		
		particleObjects.push( part );
		
		return { objs: particleObjects, dpi: pointIndex /*, spi: styleIndex*/ };			
	};	
};

STCJS.SpatioTemporalLayer.prototype = new STCJS.Layer;

/** **************************************************************** **/
/**
 * UN-USED - TO UPDATE ON FUTURE VERSION
 */
STCJS.STPeriodSetLayer = function( name, data, properties )
{
	var context = this;
	
	/*
	 * 
	 */
	var defaultStylePeriods = function( data, dataPoint, dataPointIndex )
	{
		var periodStyleParams = {size: 20, colour: new THREE.Color(0x00ffff) };
		return new STCJS.CylinderStyle( periodStyleParams );					
	};
	
	/*
	 * 
	 */
	var defaultHighlightPeriods = function( data, dataPeriod, dataPeriodIndex, periodStyle )
	{
		var periodStyleParams = {size: 30, colour: new THREE.Color(0xff0000) };
		return new STCJS.CylinderStyle( periodStyleParams );
	};
	
	var currentHighlight = 
	{
		feature: null,
		dataPointIndex: null
	};	
	
	this.stylePeriods = ("stylePeriods" in properties)? properties.stylePeriods : defaultStylePeriods;
	this.styleHighlights = ("highlightPeriods" in properties)? properties.highlightPeriods : defaultHighlightPeriods;
	
	STCJS.Layer.call( this, name, data );
	this.representationObjects = [];
	
	/**
	 * 
	 */
	this.drawLayer = function()
	{
		var layerObjects = [];
		if( this.visible )
		{		
			layerObjects = layerObjects.concat( createPeriodObjects() );			
			this.representationObjects = layerObjects;			
			for( var i = 0; i < layerObjects.length; i++ )			
				this.stc.scene.add( layerObjects[i] );
			this.stc.refresh();			
		}
	};
	
	/**
	 * 
	 */
	this.removeLayer = function()
	{
		if( this.representationObjects === null ) return;
		for( var i = 0; i < this.representationObjects.length; i++ )
			this.stc.scene.remove( this.representationObjects[i] );
		this.stc.refresh();
	};
	
	/**
	 * 
	 */
	this.updateRepresentationLocation = function()
	{
		if( this.representationObjects === null ) return;
		
		for( var i = 0; i < this.representationObjects.length; i++ )
		{
			if( this.representationObjects[i].objtype === STCJS.UTILS.OBJECT_TYPES.CYLINDER_PERIOD )
			{				
				var period = this.data.periods[ this.representationObjects[i].dpi ];
				var point = period.toSTPoint();
				point.setTime( (period.timestamp_end + period.timestamp_start)/2 )
				var vertex = this.stc.stpoint2stc( point );			
				this.representationObjects[i].position.x = vertex.x;
				this.representationObjects[i].position.y = vertex.y;
				this.representationObjects[i].position.z = vertex.z;
				
				var p1 = period.toSTPoint();
				var p2 = period.toSTPoint();
				p2.setTime( period.timestamp_end );				
				this.representationObjects[i].scale.y = this.stc.stpoint2stc(p2).y - this.stc.stpoint2stc(p1).y;									
			}								
		}
	};
	
	/**
	 * 
	 */
	this.removeHighlight = function()
	{
		if( currentHighlight.feature === null ) return;
		
		if( currentHighlight.feature.objtype === STCJS.UTILS.OBJECT_TYPES.CYLINDER_PERIOD )
		{
			var style = this.stylePeriods( this.data, this.data.periods[ currentHighlight.dataPointIndex ], currentHighlight.dataPointIndex );
			
			currentHighlight.feature.geometry.radiusTop = style.radiusTop;
			currentHighlight.feature.geometry.radiusBottom = style.radiusBottom;
			currentHighlight.feature.geometry.verticesNeedUpdate = true;
						
			for( var i = 0; i < currentHighlight.feature.geometry.vertices.length; i ++ )
			{
				if( i < currentHighlight.feature.geometry.vertices.length/2 - 1 || i == currentHighlight.feature.geometry.vertices.length - 2 ) 
				{
					currentHighlight.feature.material.attributes.colour.value[i] = style.endColour;
					currentHighlight.feature.material.attributes.alpha.value[i] = style.endAlpha;
				}
				else if( i >= currentHighlight.feature.geometry.vertices.length/2-1 )
				{
					currentHighlight.feature.material.attributes.colour.value[i] = style.startColour;
					currentHighlight.feature.material.attributes.alpha.value[i] = style.startAlpha;
				}
			}
			
			currentHighlight.feature.material.attributes.colour.needsUpdate = true;
			currentHighlight.feature.material.attributes.alpha.needsUpdate = true;		
		}			
		currentHighlight.feature = null;
		currentHighlight.dataPointIndex = null;		
		this.stc.refresh();		
	};	
	
	/**
	 * 
	 */
	this.highlightFeature = function( feature, dataPointIndex )//, vertexPoint, vertexPoint2 )
	{
		if( this.styleHighlights === null ) return null;		
		
		if( currentHighlight !== null && currentHighlight.feature !== null )
			if( currentHighlight.feature.uuid !== feature.uuid )
			{
				this.removeHighlight();
			}
			else
				return null;
			
		var dataPoint = this.data.periods[ dataPointIndex ];
		
		if( feature.objtype === STCJS.UTILS.OBJECT_TYPES.CYLINDER_PERIOD )
		{			
			var pstyle = this.stylePeriods( this.data, this.data.periods[dataPointIndex], dataPointIndex );
			var hstyle = this.styleHighlights( this.data, this.data.periods[dataPointIndex], dataPointIndex, pstyle );
			
			var uniforms = {};
			var attributes = {
				alpha: {type: "f", value: [] },
				colour: {type:"c", value: [] }
			};
				
			var radiusTop = (hstyle.radiusTop !== null )? hstyle.radiusTop : 1;
			var radiusBottom = (hstyle.radiusBottom !== null )? hstyle.radiusBottom : 1;
									
			var sColour = (hstyle.startColour !== null)? hstyle.startColour : new THREE.Color(0xff0000);
			var eColour = (hstyle.endColour !== null)? hstyle.endColour : new THREE.Color(0xff0000);
			var sAlpha = (hstyle.startAlpha !== null)? hstyle.startAlpha : 1;
			var eAlpha = (hstyle.endAlpha !== null)? hstyle.endAlpha : 1; 
						
			//feature.geometry.radiusTop = radiusTop;
			//feature.geometry.radiusBottom = radiusBottom;
			feature.geometry.dispose();
			feature.geometry = new THREE.CylinderGeometry( radiusTop, radiusBottom, -1, 8 );
			feature.geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / -2 ) );
			feature.geometry.computeBoundingSphere();
						
			for( var i = 0; i < feature.geometry.vertices.length; i ++ )
			{
				if( i < feature.geometry.vertices.length/2 - 1 || i == feature.geometry.vertices.length - 2 ) 
				{
					feature.material.attributes.colour.value[i] = eColour;
					feature.material.attributes.alpha.value[i] = eAlpha;
				}
				else if( i >= feature.geometry.vertices.length/2-1 )
				{
					feature.material.attributes.colour.value[i] = sColour;
					feature.material.attributes.alpha.value[i] = sAlpha;
				}
			}
			feature.material.attributes.colour.needsUpdate = true;
			feature.material.attributes.alpha.needsUpdate = true;
			
			currentHighlight.feature = feature;
			currentHighlight.dataPointIndex = dataPointIndex;
		}		
				
		this.stc.refresh();
	};
	
	/*
	 * 
	 */
	var createPeriodObjects = function()
	{
		if( context.stylePeriods === null ) return [];
		//if( context.pointstyles === null ) return [];
		var periodObjects  = [];
		
		var data = context.data;
		var pstyles = context.periodstyles;
				
		var dataPointIndex = 0; //pointStyleIndex = 0;
		
		while( dataPointIndex < data.periods.length )
		{
			var pointStyle = context.stylePeriods( data, data.periods[dataPointIndex], dataPointIndex );//pstyles[pointStyleIndex];
			var result;
			if( pointStyle instanceof STCJS.CylinderStyle )
			{
				result = createCylinderPoints( data, dataPointIndex /*, pstyles, pointStyleIndex */);							
			}
			periodObjects = periodObjects.concat( result.objs );
			dataPointIndex = result.dpi;
			//pointStyleIndex = result.spi;		
		}		
		return periodObjects;
	};
	
	/*
	 * 
	 */
	var createCylinderPoints = function( data, pointIndex )//, styles, styleIndex )
	{		
		var cylinderObjects = [];
		var style = context.stylePeriods( data, data.periods[pointIndex], pointIndex );
		while( (style instanceof STCJS.CylinderStyle) && pointIndex < data.periods.length )
		{
			var uniforms = {};
			var attributes = {
				alpha: {type: "f", value: [] },
				colour: {type:"c", value: [] }
			};
			
			var pointPer = data.periods[pointIndex];
			var pointMom = pointPer.toSTPoint();
			pointMom.setTime( (pointPer.timestamp_end + pointPer.timestamp_start)/2 );
			
			var vertex = context.stc.stpoint2stc( pointMom );
			
			//var style = styles[styleIndex];
			style = context.stylePeriods( data, data.periods[pointIndex], pointIndex );
			
			var radiusTop = (style.radiusTop !== null )? style.radiusTop : 1;
			var radiusBottom = (style.radiusBottom !== null )? style.radiusBottom : 1;
					
			var height = getCylSize( pointPer );
					
			var faces = 8;			
			var sColour = (style.startColour !== null)? style.startColour : new THREE.Color(0xff0000);
			var eColour = (style.endColour !== null)? style.endColour : new THREE.Color(0xff0000);
			var sAlpha = (style.startAlpha !== null)? style.startAlpha : 1;
			var eAlpha = (style.endAlpha !== null)? style.endAlpha : 1; 
						
			var geometry = new THREE.CylinderGeometry( 1, 1 , 1, faces); //radiusTop, radiusBottom, height, faces );
			
			//geometry.applyMatrix( new THREE.Matrix4().makeRotationX( Math.PI / -2 ) );
			
			for( var i = 0; i < geometry.vertices.length; i ++ )
			{
				if( i < geometry.vertices.length/2 - 1 || i == geometry.vertices.length - 2 ) 
				{
					attributes.colour.value[i] = eColour;
					attributes.alpha.value[i] = eAlpha;
				}
				else if( i >= geometry.vertices.length/2-1 )
				{
					attributes.colour.value[i] = sColour;
					attributes.alpha.value[i] = sAlpha;
				}
			}
						
			var shaderStyleSeed = {};
			shaderStyleSeed.alpha = true;
			shaderStyleSeed.color = true;
						
			var material = new THREE.ShaderMaterial( {
				uniforms: uniforms,
				attributes: attributes,
				vertexShader: STCJS.UTILS.generateLineVertexShader( shaderStyleSeed ),
				fragmentShader: STCJS.UTILS.generateLineFragmentShader( shaderStyleSeed ),
				transparent: true
			});
			
			var period = new THREE.Mesh( geometry, material );
			period.scale.set( radiusTop, height, radiusBottom );			
			period.position.x = vertex.x;
			period.position.y = vertex.y;
			period.position.z = vertex.z;
			
						
			period.overdraw = true;
			period.layer = context.name;
			period.objtype = STCJS.UTILS.OBJECT_TYPES.CYLINDER_PERIOD;
			period.name = data.name+"_"+period.objtype;
			period.datauuid = data.uuid;
			period.dpi = pointIndex;						
			period.position.x = vertex.x;
			period.position.y = vertex.y;
			period.position.z = vertex.z;
			period.display = true;
			
			cylinderObjects.push( period );
			
			pointIndex ++;  
		}		
		return { objs: cylinderObjects, dpi: pointIndex /*, spi: styleIndex*/ };	
	};	
	
	/*
	 * 
	 */
	var getCylSize = function( stperiod )
	{
		var p1 = stperiod.toSTPoint();
		var p2 = stperiod.toSTPoint();
		p2.setTime( stperiod.timestamp_end );
		return Math.abs( context.stc.stpoint2stc( p2 ).y - context.stc.stpoint2stc( p1 ).y );			
	};
};

STCJS.STPeriodSetLayer.prototype = new STCJS.Layer;
/** **************************************************************** **/
/**
 * 
 */
STCJS.Style = function( params )
{
	this.width = ( params !== undefined && "width" in params )? params.width : 1;
	this.height = (params !== undefined && "height" in params )? params.height : 1;
	this.size = ( params !== undefined && "size" in params)? params.size : 1;
	this.scale = ( params !== undefined && "scale" in params)? params.scale : 1;
	this.rotation = ( params !== undefined && "rotation" in params)? params.rotation : null;
	
	this.alpha = ( params !== undefined && "alpha" in params)? params.alpha : 1;
	this.colour = ( params !== undefined && "colour" in params)? params.colour : null;
	this.texture = ( params !== undefined && "texture" in params)? params.texture : null;	
	//
	this.lineWidth = ( params !== undefined && "lineWidth" in params)? params.lineWidth : this.width;
	this.dashedLine = ( params !== undefined && "dashed" in params)? params.dashed : false;
	this.lineDistance = ( params !== undefined && "lineDistance" in params)? params.lineDistance : null;
	this.totalSize = ( params !== undefined && "totalSize" in params)? params.totalSize : null;
	this.dashSize = ( params !== undefined && "dashSize" in params)? params.dashSize : null;
	this.gapSize = ( params !== undefined && "gapSize" in params)? params.gapSize : null;
	//
	this.startColour = ( params !== undefined && "startColour" in params)? params.startColour : this.colour;
	this.endColour = ( params !== undefined && "endColour" in params)? params.endColour : this.colour; 
	//
	this.startAlpha = ( params !== undefined && "startAlpha" in params)? params.startAlpha : this.alpha;
	this.endAlpha = ( params !== undefined && "endAlpha" in params)? params.endAlpha : this.alpha; 
};

STCJS.Style.prototype = 
{
	setSize: function( size )
	{
		this.size = size;
	},
	
	setScale: function( scale )
	{
		this.scale = scale;
	},
	
	setAlpha: function( alpha )
	{
		this.alpha = alpha;
	},
	
	setColour: function( colour )
	{
		this.colour = colour;
	},
	
	setRGB: function( r, g, b )
	{
		this.colour = new THREE.Colour( r, g, b );
	},
	
	setRGBA: function( r, g, b, a )
	{
		this.colour = new THREE.Colour( r, g, b );
		this.alpha = a;
	},
	
	setTexture: function( texture )
	{
		this.texture = texture;
	},
	
	setLineWidth: function( linewidth )
	{
		this.lineWidth = linewidth;
	},
	
	/**
	 * Defines the parameters to turn a line representation into a dashed line
	 * @param lineDistance <Float> distance between the line segments
	 * @param totalSize <Float> line segments size
	 * @param dashSize <Float> size of the gaps between the lines
	 */ 
	setDashLine: function( lineDistance, totalSize, dashSize )
	{
		this.dashedLine = true;
		this.lineDistance = lineDistance;
		this.totalSize = totalSize;
		this.dashSize = dashSize;
	},
	
	setPointRotation: function( rotation )
	{
		this.rotation = rotation;
	}
};

/** **************************************************************** **/ 
/**
 * 
 */
STCJS.PointStyle = function( params )
{
	STCJS.Style.call( this, params );
};

STCJS.PointStyle.prototype = new STCJS.Style;
/** **************************************************************** **/ 
/**
 * 
 */
STCJS.ParticleStyle = function( params )
{
	STCJS.Style.call( this, params );
};

STCJS.ParticleStyle.prototype = new STCJS.Style;
/** **************************************************************** **/
/**
 * 
 */
STCJS.CubeStyle = function( params )
{
	STCJS.Style.call( this, params );
	this.x = ( "x" in params)? params.x : this.size;
	this.y = ( "y" in params)? params.y : this.size;
	this.z = ( "z" in params)? params.z : this.size;
};

STCJS.CubeStyle.prototype = new STCJS.Style; 
/** **************************************************************** **/
/**
 * 
 */
STCJS.SphereStyle = function( params )
{
	STCJS.Style.call( this, params );
	this.radius = ( "radius" in params )? params.radius : this.size;
};

STCJS.SphereStyle.prototype = new STCJS.Style; 
/** **************************************************************** **/
/**
 * 
 */
STCJS.CylinderStyle = function( params )
{
	STCJS.Style.call( this, params );
	this.radiusTop = ("topRadius" in params)? params.topRadius : this.size;
	this.radiusBottom = ("bottomRadius" in params)? params.bottomRadius : this.size;
};

STCJS.CylinderStyle.prototype = new STCJS.Style; 
/** **************************************************************** **/
/**
 * 
 */
STCJS.LineStyle = function( params )
{
	STCJS.Style.call( this, params );
};

STCJS.LineStyle.prototype = new STCJS.Style;
/** **************************************************************** **/
/**
 * 
 */
STCJS.PolyLineStyle = function( params )
{
	STCJS.Style.call( this, params );
	this.startLineWidth = ("startLineWidth" in params)? params.startLineWidth : this.width;
	this.endLineWidth = ("endLineWidth" in params)? params.endLineWidth : this.width; 
};

STCJS.PolyLineStyle.prototype = new STCJS.Style;
/** **************************************************************** **/

/** **************************************************************** **/
/**
 * DEPRICATED
 */
STCJS.DEFAULT_TILES = function()
{
	var tile01 = new STCJS.Tile( "img/tiles/t01.png", { up:55.34935987931996, down:10.436337276206334, right:129.638671875, left:73.388671875 }, 1 );
	var tile10 = new STCJS.Tile( "img/tiles/t10.png", { up:46.522855591585255, down:23.837967149063267, right:101.6455078125, left:73.5205078125 }, 2 );
	var tile11 = new STCJS.Tile( "img/tiles/t11.png", { up:46.522855591585255, down:23.837967149063267, right:115.576171875, left:87.451171875 }, 2 );
	var tile12 = new STCJS.Tile( "img/tiles/t12.png", { up:46.522855591585255, down:23.837967149063267, right:130.78125, left:102.65625 }, 2 );
	
	/*
	 * z1: tile01
	 * z2: tile10 tile11 tile12
	 */ 
	tile01.zin = tile11;
	tile11.zout = tile01;
	tile10.east = tile11;
	tile11.west = tile10;
	tile11.east = tile12;
	tile12.west = tile11;
	tile12.zout = tile01;
	
	return new STCJS.TilesControl( [ tile01, tile10, tile11, tile12 ] );	
};

/** **************************************************************** **/
/**
 * 
 */ 
STCJS.Tile = function( image, boundingBox, zoomlevel )
{
	var loader = new THREE.TextureLoader( );
	this.image = loader.load(
		image,
		function( texture ){},
		function( xhr ){},
		function( xhr ){
			console.log( "Error occurred while loading "+image);
		}
	);
	//this.image = THREE.ImageUtils.loadTexture( image );
	this.imageName = image;
	
	this.bbox = boundingBox;
	this.zoomlevel = zoomlevel;
	this.north = null;
	this.south = null;
	this.east = null;
	this.west = null;
	this.zin = null;
	this.zout = null;
	
	this.getTileCenter = function()
	{
		return { 
			lat: (this.bbox.up+this.bbox.down)/2, 
			lon: (this.bbox.right+this.bbox.left)/2
		};
	}
};
/** **************************************************************** **/
// Set it manually damn it

// http://jsfiddle.net/wilt/x4ne06cx/ 
// use big plane with several faces... move it as needed?
// create materials ...  switch as needed?
// add context?
/**
 * 
 */ 
STCJS.TilesControl = function( tiles )
{
	this.tiles = tiles;
	this.currentTile = this.tiles[0];
	this.minZoom = this.tiles[0].zoomlevel;
	this.maxZoom = this.tiles[0].zoomlevel;
	
	for( var i = 0; i < tiles.length; i++ )
	{
		if( tiles[i].zoomlevel < this.minZoom ) this.minZoom = tiles[i].zoomlevel;
		if( tiles[i].zoomlevel > this.maxZoom ) this.maxZoom = tiles[i].zoomlevel;
	}
	
	this.tiles = organizeTiles( this.tiles, true );
	
	/*
	 *@requires tiles.length > 0
	 *@requires list extracted by GMaps Tile Retriever?
	 */
	function organizeTiles( tiles, preOrganized )
	{
		// #1 Split tiles per zoom level
		var tilesPerZoom = [];
		var currentTiles = [];
		var currentZoomlvl = -1;
	
		for( var i = 0, ntiles = tiles.length; i < ntiles; i++ )
		{
			if( tiles[i].zoomlevel != currentZoomlvl )
			{
				currentZoomlvl = tiles[i].zoomlevel;
				if( currentTiles.length > 0 )
					tilesPerZoom.push( currentTiles );
				currentTiles = [];
			}
			currentTiles.push( tiles[i] );
		}
		if( currentTiles.length > 0 )
			tilesPerZoom.push( currentTiles );
	
		//console.log( "tpz", tilesPerZoom );
	
		// #2 Organize tile relations
		if( preOrganized ) // let's assume it is, because... time
		{		
			for( var i = 0, nZooms = tilesPerZoom.length; i < nZooms; i++ )
			{
				var panDivisionFactor = Math.round( Math.sqrt( tilesPerZoom[i].length ) );
	
				if( panDivisionFactor > 0 )
				{
					var zTiles = tilesPerZoom[i];
					//console.log( ">>", zTiles);
					for( var j = 0, nZTiles = zTiles.length; j < nZTiles; j++ )
					{
						zTiles[j].north = ( (j)-panDivisionFactor >= 0 )? zTiles[j-panDivisionFactor] : null ;
						zTiles[j].south = ( j+panDivisionFactor < nZTiles )? zTiles[j+panDivisionFactor] : null ;
						zTiles[j].east = ((j+1)%panDivisionFactor != 0)? zTiles[j+1] : null;
						zTiles[j].west = (j%panDivisionFactor != 0)? zTiles[j-1] : null;
	
						// HERE
						if( i > 0 ) // zoom outs
							zTiles[j].zout = tilesPerZoom[i-1][ getClosestCenterIndex( zTiles[j].getTileCenter(), tilesPerZoom[i-1] ) ];
						if( i < nZooms-1 ) // zoom ins
							zTiles[j].zin = tilesPerZoom[i+1][ getClosestCenterIndex( zTiles[j].getTileCenter(), tilesPerZoom[i+1] ) ];
					}
				}
			}
		}
		
		return tiles;
	}
	
	/*
	 * 
	 */
	function getClosestCenterIndex( center, tiles )
	{	
		function GPoint( lat, lon )
		{
			this.latitude = lat;
			this.longitude = lon;
	
			this.lat = function(){ return this.latitude; };
			this.lng = function(){ return this.longitude; };
		}
	
		var c = new GPoint(center.lat, center.lon);
		var index = 0;
		var tcenter = tiles[0].getTileCenter();
		var ccp = new GPoint( tcenter.lat, tcenter.lon );
		for( var i = 0, nTiles = tiles.length; i < nTiles; i++ )
		{
			var tcenter = tiles[i].getTileCenter();
			var p = new GPoint( tcenter.lat, tcenter.lon );
			var dist1 = getDistance( c, p );
			var dist2 = getDistance( c, ccp );
			
			//console.log( "curr dist", dist2, "chall dist", dist1,  tiles[i].imageName );
			  
			if( dist1 <= dist2 )
			{
				index = i;
				ccp = p;
			}
		}
	
		return index;
	}
	
	function rad(x){ return x * Math.PI / 180; }
	
	// from http://stackoverflow.com/questions/1502590/calculate-distance-between-two-points-in-google-maps-v3
	function getDistance(p1, p2) 
	{
		var R = 6378137; // Earth’s mean radius in meter
		var dLat = rad(p2.lat() - p1.lat());
		var dLong = rad(p2.lng() - p1.lng());
		var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
		Math.sin(dLong / 2) * Math.sin(dLong / 2);
		var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		var d = R * c;
		return d; // returns the distance in meter
	}
	
};

STCJS.TilesControl.prototype = 
{	
	goNorth: function()
	{
		this.currentTile = (this.currentTile.north !== null)? this.currentTile.north : this.currentTile;
	},
	
	goSouth: function()
	{
		this.currentTile = (this.currentTile.south !== null)? this.currentTile.south : this.currentTile;
	},
	
	goEast: function()
	{
		this.currentTile = (this.currentTile.east !== null)? this.currentTile.east : this.currentTile;
	},
	
	goWest: function()
	{
		this.currentTile = (this.currentTile.west !== null)? this.currentTile.west : this.currentTile;
	},
	
	zoomIn: function()
	{
		this.currentTile = (this.currentTile.zin !== null)? this.currentTile.zin : this.currentTile;
	},
	
	zoomOut: function()
	{
		this.currentTile = (this.currentTile.zout !== null)? this.currentTile.zout : this.currentTile;
	},
	
	fitInBBox: function( bbox2fit )
	{
		var contains = function( bbox1, bbox2 )
		{
			return bbox1.up > bbox2.up && bbox1.down < bbox2.down && bbox1.left < bbox2.left && bbox1.right > bbox2.right;
		};
		
		var pseudoArea = function( boundBox )
		{
			return Math.abs( (boundBox.up-boundBox.down) * (boundBox.right-boundBox.left) );
		};
		
		var tile = this.tiles[0];
		for( var i = 1; i < this.tiles.length; i++ )
		{
			if( contains( this.tiles[i].bbox, bbox2fit ) )
			{
				//console.log( JSON.stringify(this.tiles[i].bbox), JSON.stringify(bbox2fit) );
				var a1 = pseudoArea(this.tiles[i].bbox);
				var a2 = pseudoArea(tile.bbox);
				if( a1 <= a2 )
					tile = this.tiles[i];
			}
				
		}
		
		this.currentTile = tile;
	},

	setClosestZoomCenter: function( zoom, center )
	{
		var rad = function (x){ return x * Math.PI / 180; };

		var getDistance = function( p1, p2 ) 
		{
			var R = 6378137; // Earth’s mean radius in meter
			var dLat = rad(p2.lat - p1.lat);
			var dLong = rad(p2.lng - p1.lng);
			var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
				Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) *
				Math.sin(dLong / 2) * Math.sin(dLong / 2);
			var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			var d = R * c;
			return d; // returns the distance in meter
		};

		var tile = this.tiles[0];

		for( var i = 1; i < this.tiles.length; i++ )
		{
			if( zoom == this.tiles[i].zoomlevel && 
				getDistance(this.tiles[i].getTileCenter(), center) <= getDistance(tile.getTileCenter(), center) )
				tile = this.tiles[i];
		}
		
		this.currentTile = tile;
	}
};

/** **************************************************************** **/
/**
 * 
 */ 
STCJS.UTILS = function(){};

/**
 * 
 */
STCJS.UTILS.TIME_FLAGS = 
{
	ONE_HOUR: 3600, // (sec)
	ONE_DAY: 86400, // (sec)
	ONE_WEEK: 604800, // 7 days
	ONE_MONTH: 2592000, // 30 days
	NONE: -1
};

/**
 * 
 */
STCJS.UTILS.OBJECT_TYPES = 
{
	H_PARTICLE_POINT: "stpartpoint_h",
	HCLINE: "hcpline",
	PARTICLE_POINT: "stpartpoint", 
	CUBE_POINT: "stcubepoint",
	SPHERE_POINT: "stspherepoint",
	LINE: "stline",
	POLYLINE: "stpolyline",
	CYLINDER_PERIOD: "stcylperiod"
};


/**
 * Calculates the closest point to pointC in the line that passes through pointA and pointB
 * @param stc -
 * @param pointA - 3D point where the line 'begins'
 * @param pointB - 3D point where the line 'ends'
 * @param pointC - 3D point from which we want to find the closest point of
 * @returns closest point of pointC in the line defined by pointA and pointB
 */
STCJS.UTILS.getClosestPointTo3DLine = function( stc, pointA, pointB, pointC )
{
	/*var b = stc.stpoint2stc( pointB );
	var a = stc.stpoint2stc( pointA );
	var c = pointC;*/
							
	var ab = pointB.sub( pointA );
	var ac = pointC.sub( pointA );						
	var w2 = ac.sub( ab.multiplyScalar( ac.dot(ab)/ab.lengthSq() ) ); 
	
	return pointC.sub(w2);
};

/** 
 * Converts a timestamp to a textual format based on the STC's current temporal granularity
 * @param time - timestamp in mlsecs
 * @return time in a textual format
 */ 
STCJS.UTILS.getTextualTimestamp = function( time, axisUnit )
{
	var textualTimestamp = "";
	var date = new Date(time * 1000);
	if( axisUnit == STCJS.UTILS.TIME_FLAGS.NONE )
	{
		textualTimestamp = 
			((date.getDate() < 10 )? "0"+date.getDate() : date.getDate() )+"/"+( (date.getMonth()+1 < 10)? "0"+(date.getMonth()+1) : (date.getMonth()+1) )+"/"+(date.getFullYear()) +
			"<br>"+( (date.getHours() < 10)? "0"+(date.getHours()) : (date.getHours()) ) +":"+ ((date.getMinutes() < 10)? "0"+(date.getMinutes()) : (date.getMinutes() ));
	}
	else if( axisUnit >= STCJS.UTILS.TIME_FLAGS.ONE_MONTH )
		textualTimestamp = ( (date.getMonth()+1 < 10)? "0"+(date.getMonth()+1) : (date.getMonth()+1) )+"/"+(date.getFullYear());
	else if( axisUnit >= STCJS.UTILS.TIME_FLAGS.ONE_WEEK )
		textualTimestamp = ((date.getDate() < 10 )? "0"+date.getDate() : date.getDate() )+"/"+( (date.getMonth()+1 < 10)? "0"+(date.getMonth()+1) : (date.getMonth()+1) )+"/"+(date.getFullYear());
	else if( axisUnit >= STCJS.UTILS.TIME_FLAGS.ONE_DAY )
		textualTimestamp = ((date.getDate() < 10 )? "0"+date.getDate() : date.getDate() )+"/"+( (date.getMonth()+1 < 10)? "0"+(date.getMonth()+1) : (date.getMonth()+1) )+"/"+(date.getFullYear());
	else if( axisUnit >= STCJS.UTILS.TIME_FLAGS.ONE_HOUR )
		textualTimestamp = ( (date.getHours() < 10)? "0"+(date.getHours()) : (date.getHours()) ) +":"+ ((date.getMinutes() < 10)? "0"+(date.getMinutes()) : (date.getMinutes() ));	
	
	return textualTimestamp;
};

/**
 * Adapted from https://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
 */
STCJS.UTILS.getTextSprite = function( message, params )
{
	/*
	 * 
	 */
	var roundRect = function(ctx, x, y, w, h, r) 
	{
	    ctx.beginPath();
	    ctx.moveTo(x+r, y);
	    ctx.lineTo(x+w-r, y);
	    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
	    ctx.lineTo(x+w, y+h-r);
	    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
	    ctx.lineTo(x+r, y+h);
	    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
	    ctx.lineTo(x, y+r);
	    ctx.quadraticCurveTo(x, y, x+r, y);
	    ctx.closePath();
	    ctx.fill();
		ctx.stroke();   
	};

	if ( parameters === undefined ) parameters = {};
	
	var fontface 		= parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
	var fontsize 		= parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
	var borderColor 	= parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };
	var labelScale 		= parameters.hasOwnProperty("labelSclae")? parameters["labelScale"] : {x: 100, y: 50, z: 1.0 };
	
	var spriteAlignment = THREE.SpriteAlignment.topLeft;
		
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
	
	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;
	
	// background color
	context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","+ backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
	
	context.lineWidth = borderThickness;
	roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
	// 1.4 is extra height factor for text below baseline: g,j,p,q.
	
	// text color
	context.fillStyle = "rgba(0, 0, 0, 1.0)";
	context.fillText( message, borderThickness, fontsize + borderThickness);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture( canvas ); 
	texture.needsUpdate = true;
	
	var materialParams = { 
		map: texture, 
		useScreenCoordinates: false, 
		alignment: spriteAlignment 
	};
	var spriteMaterial = new THREE.SpriteMaterial( materialParams );
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(labelScale.x, labelScale.y , labelScale.z );
	return sprite;
};

/**
 * 
 */ 
STCJS.UTILS.createAttributesObject = function()
{
	var attributes = {};
	attributes.size = {};
	attributes.alpha = {};
	attributes.colour = {};
	attributes.rotation = {};
	
	attributes.size.type = "f";
	attributes.alpha.type = "f";
	attributes.colour.type = "c";
	attributes.rotation.type = "f";
	
	attributes.size.value = [];
	attributes.alpha.value = [];
	attributes.colour.value = [];
	attributes.rotation.value = [];
	
	return attributes;
};

/**
 * Converst a colour in hsv format to rbb
 * @param h <Float> hue
 * @param s <Float> staturation
 * @param v <Float> value
 */ 
STCJS.UTILS.hsvToRgb = function( h, s, v ) 
{
	var r, g, b;
	var i;
	var f, p, q, t;
	
	// Make sure our arguments stay in-range
	h = Math.max(0, Math.min(360, h));
	s = Math.max(0, Math.min(100, s));
	v = Math.max(0, Math.min(100, v));
	
	// We accept saturation and value arguments from 0 to 100 because that's
	// how Photoshop represents those values. Internally, however, the
	// saturation and value are calculated from a range of 0 to 1. We make
	// That conversion here.
	s /= 100;
	v /= 100;
	
	if(s == 0) {
		// Achromatic (grey)
		r = g = b = v;
		return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	}
		
	h /= 60; // sector 0 to 5
	i = Math.floor(h);
	f = h - i; // factorial part of h
	p = v * (1 - s);
	q = v * (1 - s * f);
	t = v * (1 - s * (1 - f));

	switch(i) {
		case 0:	r = v; g = t; b = p; break;
		case 1: r = q; g = v; b = p; break;
		case 2: r = p; g = v; b = t; break;
		case 3: r = p; g = q; b = v; break;
		case 4: r = t; g = p; b = v; break;
		default: r = v; g = p; b = q;
	}
	//return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
	return 'rgb('+Math.round(r * 255)+','+Math.round(g * 255)+','+Math.round(b * 255)+')'
};
	
/**
 * Gets total colours
 * @param total <Integer> number of colours
 * @returns <Array:<String>> Array with total nº of colours
 */
STCJS.UTILS.getRandomColours = function( total )
{
	var delta = 360 / (total - 1); // distribute the colors evenly on the hue range
	var colours = []; // hold the generated colors
	var hue = Math.random()*360;
	for( var i = 0; i < total; i++ )
	{
		var randomSaturation = Math.random()*100;
		var randomValue = Math.random()*30+65;
		colours.push( TRAJMAP2D.UTILS.hsvToRgb( hue, randomSaturation, randomValue ) );
		hue = ( hue + delta ) % 360;
	}	
	return colours;	
};
	
/**
* Generates glsl code for the vertex shader to be used for the definition of particle points
* @param attr - key: <bool>value array with the the types of attributes in need to be used 
* @returns <String> glsl code
*/  
STCJS.UTILS.generateParticleVertexShader = function( attr )
{
	var vertexShaderText = "";//"//auto generated vertex shader\n";

	vertexShaderText += "uniform int tfocus;\n\n";
	vertexShaderText += "uniform int tstart;\n\n";
	vertexShaderText += "uniform int tend;\n\n";
	if( "size" in attr ) vertexShaderText += "attribute float size;\n";
	if( "alpha" in attr ) vertexShaderText += "attribute float alpha;\n";
	if( "color" in attr ) vertexShaderText += "attribute vec3 colour;\n";		
	if( "rotation" in attr ) vertexShaderText += "attribute float rotation;\n";
	vertexShaderText += "attribute float time;\n";

	if( "alpha" in attr ) vertexShaderText += "varying float vAlpha;\n";
	if( "color" in attr ) vertexShaderText += "varying vec3 vColor;\n";		
	if( "rotation" in attr ) vertexShaderText += "varying float vRotation;\n";
	vertexShaderText += "varying float vTime;\n";

	vertexShaderText += "void main()\n{\n  vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );\n  gl_Position = projectionMatrix * mvPosition;\n  ";
	if( "size" in attr ) vertexShaderText += "gl_PointSize = size;\n  ";
	else vertexShaderText += "gl_PointSize = 3;\n  ";
	if( "alpha" in attr ) vertexShaderText += "vAlpha = alpha;\n  ";
	else vertexShaderText += "vAlpha = 1;\n  ";
	if( "color" in attr ) vertexShaderText += "vColor = colour;\n";
	else vertexShaderText += "vColor = vec3(0,0,0);\n";
	if( "rotation" in attr ) vertexShaderText += "  vRotation = rotation;\n"
	vertexShaderText += "  vTime = time;\n"
	vertexShaderText += "	if( tfocus == 1 && (int(vTime) <= tstart || int(vTime) >= tend) ) gl_PointSize = 0.0;\n"
	vertexShaderText += "}\n";		 
	return vertexShaderText;
};

/**
* Generates glsl code for the fragment shader to be used for the definition of particle points
* @param attr - key: <bool>value array with the the types of attributes in need to be used 
* @returns <String> glsl code
*/ 
STCJS.UTILS.generateParticleFragmentShader = function( attr )
{
	var fragmentShaderText = "";//"//auto generated fragment shader\n";
	fragmentShaderText += "uniform int tfocus;\n\n";
	fragmentShaderText += "uniform int tstart;\n\n";
	fragmentShaderText += "uniform int tend;\n\n";
	fragmentShaderText += "uniform vec3 color;\n";
	 if( "texture" in attr ) fragmentShaderText += "uniform sampler2D texture;\n\n";
	 if( "alpha" in attr ) fragmentShaderText += "varying float vAlpha;\n";
	 if( "color" in attr ) fragmentShaderText += "varying vec3 vColor;\n";
	 if( "rotation" in attr ) fragmentShaderText += "varying float vRotation;\n";
	 fragmentShaderText += "varying float vTime;\n";
	 
	 fragmentShaderText += "void main()\n{\n  ";
	 var alphaText = ("alpha" in attr)? "vAlpha" : "1.0" ;		 
	 fragmentShaderText += "float trueAlpha = "+alphaText+";\n";
	 
	 fragmentShaderText += "if( tfocus == 1 )\n";
	 fragmentShaderText += "  if( int(vTime) >= tstart && int(vTime) <= tend ) trueAlpha = trueAlpha;\n"
	 fragmentShaderText += "  else trueAlpha = 0.0;\n"

	 if( "color" in attr ) fragmentShaderText += "gl_FragColor = vec4( vColor * color, trueAlpha );\n";
	 else fragmentShaderText += "gl_FragColor = vec4( 0.0, 0.0, 0.0, trueAlpha );\n";
	 
	 if( "texture" in attr ) 
		if( "rotation" in attr )
		{
			fragmentShaderText += "  float mid = 0.5;\n";
			fragmentShaderText += "  vec2 rotated = vec2(cos(vRotation) * (gl_PointCoord.x - mid) + sin(vRotation) * (gl_PointCoord.y - mid) + mid, cos(vRotation) * (gl_PointCoord.y - mid) - sin(vRotation) * (gl_PointCoord.x - mid) + mid);\n";
			fragmentShaderText += "  gl_FragColor = gl_FragColor * texture2D( texture, rotated );\n";
		}
		else
			fragmentShaderText += "  gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );\n";
	 
	 fragmentShaderText += "}\n";
		 
	 return fragmentShaderText;
};

 /**
* Generates glsl code for the vertex shader to be used for the definition of lines
* @param attr - key: <bool>value array with the the types of attributes in need to be used 
* @returns <String> glsl code
*/ 
STCJS.UTILS.generateLineVertexShader = function( attr )
{
	var vertexShaderText = "";//"//auto generated vertex shader\n";		 
	
	if( "alpha" in attr ) vertexShaderText += "attribute float alpha;\n";
	if( "color" in attr ) vertexShaderText += "attribute vec3 colour;\n";
	if( "dashed" in attr ) vertexShaderText += "attribute float lineDistance;\nattribute float dashSize;\nattribute float totalSize;\n"+
	"varying float vLineDistance;\nvarying float vDashSize;\nvarying float vTotalSize;\n";
	vertexShaderText += "attribute float time;\n"
	vertexShaderText += "varying vec2 vUv;\n";
		 
	if( "alpha" in attr ) vertexShaderText += "varying float vAlpha;\n  ";
	if( "color" in attr ) vertexShaderText += "varying vec3 vColor;\n  ";		 
	vertexShaderText += "varying float vTime;\n";

	vertexShaderText += "void main()\n{\n  gl_Position = projectionMatrix * ( modelViewMatrix * vec4(position, 1.0) );\n  ";		 		 
	vertexShaderText += "  vUv = uv;\n"

	if( "dashed" in attr ) vertexShaderText += "vLineDistance = 1.0*lineDistance;\n  vDashSize = dashSize;\n  vTotalSize = totalSize;\n  "; // scale*lineDistance
	if( "alpha" in attr ) vertexShaderText += "vAlpha = alpha;\n  ";
	else vertexShaderText += "vAlpha = 1.0;\n  ";
	if( "color" in attr ) vertexShaderText += "vColor = colour;\n";
	else vertexShaderText += "vColor = vec3(0,0,0);\n";		 
	vertexShaderText += "  vTime = time;\n"
	vertexShaderText += "}\n";
			 
	return vertexShaderText;
};

/**
* Generates glsl code for the fragment shader to be used for the definition of lines
* @param attr - key: <bool>value array with the the types of attributes in need to be used 
* @returns <String> glsl code
*/ 
STCJS.UTILS.generateLineFragmentShader = function( attr )
{
	var fragmentShaderText = "";//"//auto generated fragment shader\n";	
	fragmentShaderText += "uniform int tfocus;\n\n";
	fragmentShaderText += "uniform int tstart;\n\n";
	fragmentShaderText += "uniform int tend;\n\n";
	fragmentShaderText += "uniform vec3 color;\n";
	if( "texture" in attr ) fragmentShaderText += "uniform sampler2D texture;\n\n";
	if( "alpha" in attr ) fragmentShaderText += "varying float vAlpha;\n";
	if( "color" in attr ) fragmentShaderText += "varying vec3 vColor;\n";
	if( "dashed" in attr ) fragmentShaderText += "varying float vLineDistance;\nvarying float vDashSize;\nvarying float vTotalSize;\n  ";
	fragmentShaderText += "varying float vTime;\n";
	fragmentShaderText += "varying vec2 vUv;\n";

	fragmentShaderText += "void main()\n{\n  ";
	var alphaText = ("alpha" in attr)? "vAlpha" : "1" ;
	fragmentShaderText += "float trueAlpha = "+alphaText+";\n";

	fragmentShaderText += "if( tfocus == 1 )\n";
	fragmentShaderText += "  if( int(vTime) >= tstart && int(vTime) <= tend ) trueAlpha = trueAlpha;\n"
	fragmentShaderText += "  else trueAlpha = 0.0;\n"

	if( "dashed" in attr ) fragmentShaderText += "if( mod( vLineDistance, vTotalSize ) > vDashSize ) { discard; }\n  ";

	if( "color" in attr ) fragmentShaderText += "gl_FragColor = vec4( color * vColor, trueAlpha );\n";
	else fragmentShaderText += "  gl_FragColor = vec4( 0.0, 0.0, 0.0, trueAlpha );\n";		 

	if( "texture" in attr ){
		fragmentShaderText += "  gl_FragColor = gl_FragColor * texture2D( texture, vUv );\n";
	}

	fragmentShaderText += "}\n";

	return fragmentShaderText;
};

/**
 * Genrates a texture/sprite
 * @param width <Float> width of the sprite
 * @param height <Float> height of the spirte
 * @returns <Canvas> representing the sprite
 */	
STCJS.UTILS.generateSprite = function( width, height ) 
{
	var canvas = document.createElement('canvas'),
	  context = canvas.getContext('2d'),
	  gradient;

	canvas.width = width;
	canvas.height = height;

	gradient = context.createRadialGradient(
	  canvas.width / 2, canvas.height / 2, 0,
	  canvas.width / 2, canvas.height / 2, canvas.width / 2
	);

	gradient.addColorStop(1.0, 'rgba(255,255,255,0)');
	gradient.addColorStop(0.0, 'rgba(255,255,255,1)');

	context.fillStyle = gradient;
	context.fillRect(0, 0, canvas.width, canvas.height);

	return canvas;
};
	
/**
 * Returns a div's dimensions
 * @param div
 * @returns key:value array with div's dimensions
 */ 
STCJS.UTILS.getDivSize = function( div )
{
	return {w: div.clientWidth, h: div.clientHeight};
};
/** **************************************************************** **/
/**
 * 
 */ 
var DIR =
{
	NORTH: 1,
	SOUTH: 2,
	EAST: 3,
	WEST: 4
};