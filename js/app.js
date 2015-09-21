'use strict';

function findFunViewModel() {
  var self = this;
  var map, city, infobox; 
  var inputLan, inputLon;   
  this.meetupEvents = ko.observableArray([]); 
  this.filteredList = ko.observableArray([]); 
  this.mapMarkers = ko.observableArray([]);  
  this.eventStatus = ko.observable('');
  this.searchStatus = ko.observable();
  this.searchLocation = ko.observable('');
  this.filterKeyword = ko.observable('');
    
  this.numEvents = ko.computed(function() {
    return self.filteredList().length;
  });  
    
  //Holds value for list togglings
  this.toggleSymbol = ko.observable('Hide Results');
    
  // AutoComplete input of city and state   
  this.doAutoComplete = function() {
    var inputLocation = new google.maps.places.Autocomplete(
      (document.getElementById('autocomplete')),
      { types: ['geocode'] });

    google.maps.event.addListener(inputLocation, 'place_changed', function() {
      var place = inputLocation.getPlace();
      inputLan= place.geometry.location.lat();
      inputLon = place.geometry.location.lng();  
    });
     
    /* if you use the event binding to capture the keypress event of an input tag, the browser will only call your handler function and will not add  
    the value of the key to the input element’s value. if you do want to let the default action proceed, just return true from your event handler   
    function.*/
    return true;
  };

 
  // Handle the input given when user searches for events in a location
  this.processLocationSearch = function() {
    self.searchStatus('');
    self.searchStatus('Searching...');
    
    var radius = 30;
    var combine = "lat=" + inputLan + "&lon=" + inputLon + "&radius=" + radius; 
    clearMarkers();
    self.meetupEvents([]);
    self.filteredList([]);
    getMeetups(combine);
  };

  //Compare search keyword against event tag of all events.  Return a filtered list and map markers of request.
  this.filterResults = function() {
    var searchWord = self.filterKeyword().toLowerCase();
    var array = self.meetupEvents();
    if(!searchWord) {
      return;
    } else {
      //first clear out all entries in the filteredList array
      self.filteredList([]);
      //Loop through the meetupEvents array and see if the search keyword matches 
      //with event tag in the list, if so push that object to the filteredList 
      //array and place the marker on the map.

      for(var i=0; i < array.length; i++) {
        if(array[i].eventTag.toLowerCase().indexOf(searchWord) != -1) {
          self.mapMarkers()[i].marker.setMap(map);
          self.filteredList.push(array[i]);
        } else self.mapMarkers()[i].marker.setMap(null);
      }
      self.eventStatus(self.numEvents() + ' events found for ' + self.filterKeyword());
    }
  };
    
  //Clear keyword from filter and show all active events in current location again.
  this.clearFilter = function() {
    self.filteredList(self.meetupEvents());
    self.eventStatus(self.numEvents() + ' events found...');
    self.filterKeyword('');
    for(var i = 0; i < self.mapMarkers().length; i++) {
      self.mapMarkers()[i].marker.setMap(map);
    }
  };
    
  //toggles the list view
  this.listToggle = function() {
    if(self.toggleSymbol() === 'Hide Results') {
      self.toggleSymbol('Show Results');
    } else {
      self.toggleSymbol('Hide Results');
    }
  };
    
  this.mapRequestTimeout = setTimeout(function() {
    $('#map-canvas').html('We had trouble loading Google Maps. Please refresh your browser and try again.');
  }, 9000);

    
  var format = {
    disableAutoPan: true,
    width: "200px",
    boxStyle: {
      backgroundColor: "rgba(255,255,255,0.9)",
      opacity: 0.9,
      borderRadius: "6px",
      padding: "12px",
    },
  };
    
  // Initialize Google map
  function mapInitialize() {
    city = new google.maps.LatLng(37.70, -122.10);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
          center: city,
          zoom: 10,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
            style: google.maps.ZoomControlStyle.SMALL
          },
          streetViewControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
            },
          mapTypeControl: false,
          panControl: false
        });
    clearTimeout(self.mapRequestTimeout);

    google.maps.event.addDomListener(window, "resize", function() {
      var center = map.getCenter();
      google.maps.event.trigger(map, "resize");
      map.setCenter(center); 
    });

    infobox = new InfoBox(format);
  }
   
  // Use API to get events data and store the info as objects in an array
  function getMeetups(location) {
    var meetupUrl = "https://api.meetup.com/find/groups?key=6f4c634b253677752b591d6a67327&";
    var order = "&order=members";   // sort by number of members
    var query = meetupUrl + location + order;
      
    $.ajax({
      url: query,
      dataType: 'jsonp',
      success: function(data) {
        var len = data.data.length;
        map.panTo({lat: data.data[0].lat, lng: data.data[0].lon});
        for(var i = 0; i < len; i++) {
          var info = data.data[i];

          if (info === undefined || info.name == undefined || info.lat == undefined || info.lon == undefined
              || info.link == undefined || info.group_photo == undefined|| info.city == undefined 
              || info.state == undefined || info.members == undefined|| info.category == undefined || info.who == undefined) 
            continue;
          var muName = info.name;
          var muLat = info.lat;
          var muLon = info.lon;
          var muLink = info.link;
          var muImg = info.group_photo.photo_link;
          var mucity = info.city;
          var mustate = info.state;
          var mumembers = info.members;
          var mutag = info.category.shortname;
          var mugroup = info.who;
             
          self.meetupEvents.push({
            eventName: muName, 
            eventLat: muLat, 
            eventLon: muLon, 
            eventLink: muLink, 
            eventImg: muImg,               
            eventAddress: mucity + ", " + mustate,
            eventTag: mutag,
            eventGroup: mugroup
          });
        }
        $('#searchResults').removeClass('hide');
        self.filteredList(self.meetupEvents());
        mapMarkers(self.meetupEvents());
        self.searchStatus('');
      },
      error: function() {
        self.eventStatus('Oops, something was wrong, please refresh and try again.');
      }
    });
  }
    
  // Create and place markers and info windows on the map based on data from API
  function mapMarkers(array) {
    $.each(array, function(index, value) {
      var latitude = value.eventLat,
          longitude = value.eventLon,
          geoLoc = new google.maps.LatLng(latitude, longitude),
          thisEvent = value.eventName;

      var infoContentString = '<div>' +
      '<p class="infoName">' + value.eventName + '</p>' +
      '<img src="' + value.eventImg + '" class="infoImg">' +
      '<p class="infoContent">' + value.eventAddress + '</p>' +
      '<p class="infoContent">Group: ' + value.eventGroup + '</p>' +
      '<p><a class="infoLink" href="' + value.eventLink + '" target="_blank">Click to view details</a></p>' +
      '</div>';

      // Custormize marker
      var icon = 'img/meetupRed.png';
      var marker = new google.maps.Marker({
        position: geoLoc,
        title: thisEvent,
        map: map,
        icon: icon
      });

      self.mapMarkers.push({marker: marker, content: infoContentString});
      self.eventStatus(self.numEvents() + ' events found...');

      //generate infobox for each event
      google.maps.event.addListener(marker, 'click', function() {
        self.searchStatus('');
        infobox.setContent(infoContentString);
        infobox.setOptions(format);	
        map.setZoom(12);
        map.setCenter(marker.position);
        infobox.open(map, marker);
        map.panBy(0, -150);

        // Add bounce animation to the clicked marker
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){ marker.setAnimation(null); }, 2000);
      });
    });
  }
  
  // When an event on the list is clicked, go to corresponding marker and open its info window.
  this.goToMarker = function(clickedEvent) {
    var clickedEventName = clickedEvent.eventName;
    for(var key in self.mapMarkers()) {
      if(clickedEventName === self.mapMarkers()[key].marker.title) {
        map.panTo(self.mapMarkers()[key].marker.position);
        map.setZoom(14);
        infobox.setContent(self.mapMarkers()[key].content);
        infobox.setOptions(format);	
        infobox.open(map, self.mapMarkers()[key].marker);
        map.panBy(0, -150);
        self.searchStatus('');        
      }
    }
  };  
    
  // Clear markers from map and array
  function clearMarkers() {
    $.each(self.mapMarkers(), function(key, value) {
      value.marker.setMap(null);
    });
    self.mapMarkers([]);
  }
  
  this.searchBarShow = ko.observable(true);
    
  this.searchToggle = function() {
    if(self.searchBarShow() === true) {
      self.searchBarShow(false);
    } else {
      self.searchBarShow(true);
    }
  };

  mapInitialize();
}

ko.bindingHandlers.selectOnFocus = {
  update: function (element) {
    ko.utils.registerEventHandler(element, 'focus', function (e) {
      element.select();
    });
  }
};

ko.applyBindings(new findFunViewModel());