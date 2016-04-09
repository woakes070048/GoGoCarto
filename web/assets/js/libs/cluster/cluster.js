/**
 * Creates a single cluster that manages a group of proximate markers.
 *  Used internally, do not call this constructor directly.
 * @constructor
 * @param {MarkerClusterer} mc The <code>MarkerClusterer</code> object with which this
 *  cluster is associated.
 */
function Cluster(mc) {
  this.markerClusterer_ = mc;
  this.map_ = mc.getMap();
  this.label_ = '';
  this.gridSize_ = mc.getGridSize();
  this.kernelRadius_ = mc.getKernelRadius();
  this.clusterRadius_ = mc.getClusterRadius();
  this.minClusterSize_ = mc.getMinimumClusterSize();
  this.averageCenter_ = mc.getAverageCenter();
  this.kernelMarkers_ = [];
  this.electronMarkers_ = [];
  this.fakeMarkers_ = [];
  this.center_ = null;
  this.bounds_ = null;
  this.clusterIcon_ = new ClusterIcon(this, mc.getStyles());
  this.isShownAsCluster_ = false;
  this.isChecked_ = false;
}


/**
 * Returns the number of markers managed by the cluster. You can call this from
 * a <code>click</code>, <code>mouseover</code>, or <code>mouseout</code> event handler
 * for the <code>MarkerClusterer</code> object.
 *
 * @return {number} The number of markers in the cluster.
 */
Cluster.prototype.getSize = function () {
  return this.kernelMarkers_.length + this.electronMarkers_.length ;
};

Cluster.prototype.setLabel = function (label) {
  return this.label_ = label.toString() ;
};

Cluster.prototype.getLabel = function () {
  return this.label_;
};

Cluster.prototype.isShownAsCluster = function () {
  return this.isShownAsCluster_;
};

Cluster.prototype.isChecked = function () {
  return this.isChecked_;
};


/**
 * Returns the array of markers managed by the cluster. You can call this from
 * a <code>click</code>, <code>mouseover</code>, or <code>mouseout</code> event handler
 * for the <code>MarkerClusterer</code> object.
 *
 * @return {Array} The array of markers in the cluster.
 */
Cluster.prototype.getMarkers = function () {
  return this.kernelMarkers_.concat(this.electronMarkers_);
};

Cluster.prototype.getKernelMarkers = function () {
  return this.kernelMarkers_;
};

Cluster.prototype.getElectronMarkers = function () {
  return this.electronMarkers_;
};


/**
 * Returns the center of the cluster. You can call this from
 * a <code>click</code>, <code>mouseover</code>, or <code>mouseout</code> event handler
 * for the <code>MarkerClusterer</code> object.
 *
 * @return {google.maps.LatLng} The center of the cluster.
 */
Cluster.prototype.getCenter = function () {
  return this.center_;
};


/**
 * Returns the map with which the cluster is associated.
 *
 * @return {google.maps.Map} The map.
 * @ignore
 */
Cluster.prototype.getMap = function () {
  return this.map_;
};


/**
 * Returns the <code>MarkerClusterer</code> object with which the cluster is associated.
 *
 * @return {MarkerClusterer} The associated marker clusterer.
 * @ignore
 */
Cluster.prototype.getMarkerClusterer = function () {
  return this.markerClusterer_;
};


/**
 * Returns the bounds of the cluster.
 *
 * @return {google.maps.LatLngBounds} the cluster bounds.
 * @ignore
 */
Cluster.prototype.getBounds = function () {
  var i;
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  var markers = this.getMarkers();
  for (i = 0; i < markers.length; i++) {
    bounds.extend(markers[i].getPosition());
  }
  return bounds;
};


/**
 * Removes the cluster from the map.
 *
 * @ignore
 */
Cluster.prototype.remove = function () {
  this.clusterIcon_.setMap(null);
  this.kernelMarkers_ = [];
  this.electronMarkers_ = [];
  delete this.kernelMarkers_;
  delete this.electronMarkers_;
};


/**
 * Adds a marker to the cluster.
 *
 * @param {google.maps.Marker} marker The marker to be added.
 * @return {boolean} True if the marker was added.
 * @ignore
 */
Cluster.prototype.addMarker = function (marker, distance) {
  var i;
  var mCount;
  var mz;

  if (this.isMarkerAlreadyAdded_(marker)) {
    return false;
  }

  if (!this.center_) 
  {
    this.center_ = marker.getPosition();
    this.calculateBounds_();

    /*var cityCircle = new google.maps.Circle({
      strokeColor: '#FF0000',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#FF0000',
      fillOpacity: 0.35,
      map: this.map_,
      center: this.center_,
      radius: 1000*2048/Math.pow(2,this.map_.getZoom())
    });*/

  } 
  else 
  {
    if (this.averageCenter_) {
      var l = this.getSize() + 1;
      var lat = (this.center_.lat() * (l - 1) + marker.getPosition().lat()) / l;
      var lng = (this.center_.lng() * (l - 1) + marker.getPosition().lng()) / l;
      this.center_ = new google.maps.LatLng(lat, lng);
      this.calculateBounds_();
    }
  }

  marker.isAdded = true;
  marker.setLabel(this.label_);

  if (distance < this.kernelRadius_) 
  {
      this.kernelMarkers_.push(marker);
      window.console.log("Adding Kernel Marker : " + distance);
  }
  else 
  {
      this.electronMarkers_.push(marker);
      window.console.log("Adding Electron Marker : " + distance);
  }

  return true;
};

Cluster.prototype.checkForClusteringGlobal = function () 
{
  // premier trie grossier des clusters à minimiser
  //window.console.log("check global cluster " + this.label_ + "visible fake : " + this.getVisibleFakeMarkers());
  if (this.kernelMarkers_.length >= 4 || (this.getSize() + this.getVisibleFakeMarkers().length) >= 6)
  {
      this.showAsCluster();
  }
}

// lorsqu'il y a 3markers dans le kernel, on vérifie
// qu'il ne touche aucun autre pour pouvoir les
// afficher
Cluster.prototype.checkForClusteringKernel = function () 
{
  var orbiteMarkers = this.electronMarkers_.concat(this.getVisibleFakeMarkers());

  // si le cluster contient au plus 3 marqueur dans le noyau et aucun en 
  // périphérie, on peut les dessiner
  if (this.kernelMarkers_.length <= 3 && orbiteMarkers.length == 0) 
  {
    window.console.log ('Cluster '+this.label_+' Juste marqueur dans kernel -> expanded');
    updateMarkersAnchor(this.kernelMarkers_);
    this.isChecked_ = true;
  }

  

/*  window.console.log("check kernel cluster " + this.label_ + "kernel : " + this.kernelMarkers_.length + ", electrons " + orbiteMarkers.length);
  
  for( var i = 0; i < this.kernelMarkers_.length; i++)
  {
    var markerKerknelPosition = this.kernelMarkers_[i].getPosition();
    if (markerKerknelPosition != this.center_)
    {
      for( var j = 0; j < orbiteMarkers.length; j++)
      {          
          var markerOrbitePosition = orbiteMarkers[j].getPosition();
          window.console.log("   analyse electron : " + markerOrbitePosition);
          var distance = distancePixelBetweenPoints( markerKerknelPosition, markerOrbitePosition, this.markerClusterer_.getProjection());

          if ( distance < this.kernelRadius_)  
          {
            this.showAsCluster();
            return true;
          }
      }  
    }    
  }

  updateMarkersAnchor(this.kernelMarkers_);

  return false;*/
}  

Cluster.prototype.updateDrawing = function () 
{  
  /*Si electron collisionne fake -> minClusterSize_
  si electron collisionne markeur cluster adjacant -> minClusterSize_
  sinon si pas collision entre kernel et electron -> updateMArkerAnchor*/

  // si le zoom est passé, on affiche les markers
  if (mz !== null && this.map_.getZoom() > mz) 
  {
    for (i = 0; i < mCount; i++)
    {
      var marker = cluster.getMarkers()[i];
      if (marker.getMap() !== this.map_) marker.setMap(this.map_);      
    }
    
  }
  // Min cluster size not reached so show the marker.
  // TODO remettre l'image originelle du marqueur (i.e. verticale)
  else if (mCount < 2) 
  {
    for (i = 0; i < mCount; i++)
    {
      var marker = cluster.getMarkers()[i];
      if (marker.getMap() !== this.map_) {
        marker.setMap(this.map_);
        marker.setIcon({
          url: iconDirectory + "map2.png",
          size: new google.maps.Size(32, 43),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(16, 43)
        });
      }
    }
  }
  // si marqueurs nombre raisonnable, on essaie de les afficher
  // sans les faire se chevaucher
  else if (mCount < this.minClusterSize_) 
  {
    /*if (marker.getMap() !== this.map_) {
      marker.setMap(this.map_);
    }

    updateMarkersAnchor();*/
  } 
  // si trop de marqueurs, on affiche le cluster
  // pour cela on cache d'abords les markers
  else 
  {
    for (i = 0; i < mCount; i++)
    {
      var marker = cluster.getMarkers()[i];
      marker.setMap(null);
    }
  } 

  //this.updateIcon_();  

};

Cluster.prototype.getVisibleFakeMarkers = function () 
{
  var markers = [];  
  for( var i = 0; i < this.fakeMarkers_.length; i++)
  {
    if (this.fakeMarkers_[i].getVisible()) markers.push(this.fakeMarkers_[i]);
  }
  return markers;
};

Cluster.prototype.removeElectronMarker = function (marker) 
{
  var index = this.electronMarkers_.indexOf(marker);
  if (index > -1) this.electronMarkers_.splice(index, 1);
}


Cluster.prototype.addFakeMarker = function (marker) 
{
  this.fakeMarkers_.push(marker);
}


/**
 * Determines if a marker lies within the cluster's bounds.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker lies in the bounds.
 * @ignore
 */
Cluster.prototype.isMarkerInClusterBounds = function (marker) {

  return this.bounds_.contains(marker.getPosition());
};


/**
 * Calculates the extended bounds of the cluster with the grid.
 */
Cluster.prototype.calculateBounds_ = function () {
  var bounds = new google.maps.LatLngBounds(this.center_, this.center_);
  this.bounds_ = this.markerClusterer_.getExtendedBounds(bounds);
};

function updateMarkersAnchor(markers) 
{
  //window.console.log('Debut updateMarkerAnchor nbreMarkers : ' + markers.length);
  if (markers == null || markers.length == 0) return;

  for (i= 0; i < markers.length; i++)
  {
     markers[i].isFree = true;
  }

  if (markers.length == 1) return;

  var righterMarker = markers[0];
  var lefterMarker = markers[0];
  for (i = 0; i < markers.length; i++) {
      
      var curr_marker= markers[i];

      if(curr_marker.getPosition().lng() < lefterMarker.getPosition().lng())
      {
          lefterMarker = curr_marker;
      }
      else if (curr_marker.getPosition().lng() > righterMarker.getPosition().lng())
      {
          righterMarker = curr_marker;
      }      
  }

  var img_width = 32;
  var img_height = 34;

  righterMarker.setIcon({
    url: iconDirectory + "map2-droite.png",
    size: new google.maps.Size(img_width, img_height),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(0, img_height)
  });
  lefterMarker.setIcon({
    url: iconDirectory + "map2-gauche.png",
    size: new google.maps.Size(img_width, img_height),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(img_width, img_height)
  });

  
}

Cluster.prototype.showExpanded = function () 
{  
    this.clusterIcon_.hide();
    this.isShownAsCluster_ = false;

    for (i = 0; i < this.getMarkers().length; i++)
    {
      var marker = this.getMarkers()[i];
      marker.setVisible(true);
    }

};

/**
 * Updates the cluster icon.
 */
Cluster.prototype.showAsCluster = function () 
{   
  window.console.log("show as cluster " + this.label_ + "nbre markers "+ this.getMarkers().length);

/*  var mz = this.markerClusterer_.getMaxZoom();

  if (mz !== null && this.map_.getZoom() > mz) 
  {    
    this.showExpanded();
    return;
  }*/

  for (i = 0; i < this.getMarkers().length; i++)
  {
    var marker = this.getMarkers()[i];
    marker.setVisible(false);
  }

  var numStyles = this.markerClusterer_.getStyles().length;
  var sums = this.markerClusterer_.getCalculator()(this.getMarkers(), numStyles);
  this.clusterIcon_.setCenter(this.center_);
  // Sebastian
  this.clusterIcon_.useStyle(sums);
  this.clusterIcon_.show();
  this.isShownAsCluster_ = true;
  this.isChecked_ = true;
};


/**
 * Determines if a marker has already been added to the cluster.
 *
 * @param {google.maps.Marker} marker The marker to check.
 * @return {boolean} True if the marker has already been added.
 */
Cluster.prototype.isMarkerAlreadyAdded_ = function (marker) {
  var i;
  
  if (!this.kernelMarkers_|| !this.electronMarkers_) return false;
  
  var markers = this.kernelMarkers_.concat(this.electronMarkers_);
  
  if (markers.indexOf) {
    return markers.indexOf(marker) !== -1;
  } else {
    for (i = 0; i < markers.length; i++) {
      if (marker === markers[i]) {
        return true;
      }
    }
  }
  return false;
};