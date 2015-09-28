/* Use hamburger button to toggle the searchbar's visibility */
var menu = $('#menu');
var drawer = $('.searchbar');
menu.click(function(e) {
  drawer.toggleClass('open');
  e.stopPropagation();
});

var map, city, infobox;
var inputLan, inputLon, inputLocation;

/* The format variable defines the style of infobox */
var format = {
  width: '200px',
  boxStyle: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    opacity: 0.9,
    borderRadius: '6px',
    padding: '12px',
  },
};

/* Initialize Google map */
function mapInitialize() {
  'use strict';

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

  google.maps.event.addDomListener(window, 'resize', function() {
    var center = map.getCenter();
    google.maps.event.trigger(map, 'resize');
    map.setCenter(center); 
  });

  /* Load JS scripts asynchronously in order:
   * Before loading infobox.js, the Google Maps API script has to be loaded.
   */
  var scriptInfoBox = document.createElement("script");
  scriptInfoBox.type = "text/javascript";
  scriptInfoBox.src = "http://google-maps-utility-library-v3.googlecode.com/svn/trunk/infobox/src/infobox.js";
  document.body.appendChild(scriptInfoBox);

  scriptInfoBox.onload = createInfoBox;

  /* The inputLocation variable defines google autocomplete object */
  inputLocation = new google.maps.places.Autocomplete(
    document.getElementById('autocomplete'), {types: ['geocode']});

  /* Transform the input location to latitude and longitude */
  google.maps.event.addListener(inputLocation, 'place_changed', function() {
    var place = inputLocation.getPlace();
    if(place.geometry !== undefined) {
      inputLan= place.geometry.location.lat();
      inputLon = place.geometry.location.lng();
    }
  });
}

/* Append Google API script to document. Invoke mapInitialize() as call back function. */
function loadScript() {
  var script = document.createElement("script");
  script.type = "text/javascript";
  script.src = "http://maps.googleapis.com/maps/api/js?key=AIzaSyBYYvjXGQqEMpHSXHouczP0KkVFOxHeMHA&libraries=places&sensor=false&callback=mapInitialize";
  script.async = true;
  setTimeout(function () {
    if(!google) {
      $('#map-canvas').html('We had trouble loading the Google Map. Please refresh your browser and try again.');
    }
  }, 8000);

  document.body.appendChild(script);
}

/* Define infobox with specific format */
function createInfoBox() {
  infobox = new InfoBox(format);
}

window.onload = loadScript;

function findFunViewModel() {
  'use strict';

  var self = this;
  /* meetupEvents variable stores all meetup events searched from Meetup API */
  self.meetupEvents = ko.observableArray([]);
  /* filteredList variable stores the filter results based on the filter keyword */
  self.filteredList = ko.observableArray([]);
  /* filterKeyword variable is the keyword in the input box */
  self.filterKeyword = ko.observable('');
  /* mapMarkers variable stores all the markers */
  self.mapMarkers = ko.observableArray([]);
  /* searchStatus variable is the status for searching events */
  self.searchStatus = ko.observable('');
  /* eventStatus variable is the status for searching results of events */
  self.eventStatus = ko.observable('');

  /* numEvents variable is calculated by the total number of filter results */
  self.numEvents = ko.computed(function() {
    return self.filteredList().length;
  });

  /* toggleSymbol variable is the status of toggling for hiding and showing searching results */
  self.toggleSymbol = ko.observable('Hide Results');

  /* If the "Enter" key is pressed, invoke searchLocation() */
  self.checkKey = function(data, e) {
    if(e.which === 13) {
      self.searchLocation();
      return false;
    }
    return true;
  };

  /* When user clicks "Search" button, invoke searchLocation() */
  self.processLocationSearch = function() {
      self.searchLocation();
  };

  /* Use google Geocode API to handle valid input locations and invalid input locations */
  self.searchLocation = function() {
    /* Find the events within 30 miles range of the input latitude and longtitude */
    var radius = 30;

    /* inputContent is the value of the location input box */
    var inputContent = $("#autocomplete").val();

    var prefix = "https://maps.googleapis.com/maps/api/geocode/json?address=";
    var key = "&key=AIzaSyAcZ0YCAXAZOUoMLUsmId2ZCZ0-p6ggVGc";
    var query = prefix + inputContent + key;

    /* Use AJAX call to get the detailed location information of the input location */
    $.ajax({
      url: query,
      dataType: 'json',
      success: function(data) {
        if(data.results.length > 0) {
          /* If the input location is a country (such as 'Australia'), or the input location is a state (such as 'Texas'), this kind of location is invalid.
           * Update search status and let user enter a valid address */
          if(data.results[0].address_components[0].types[0] == 'country' || data.results[0].address_components[0].types[0] == 'administrative_area_level_1' ) {
            self.searchStatus('Wrong address! Please enter a city and state...');
            self.eventStatus('');

            /* Clear all marker and empty meetupEvents and filteredList array */
            clearMarkers();
            self.meetupEvents([]);
            self.filteredList([]);

            $('#searchResults').addClass('hide');
            return;
          }

          /* If the Google Geocode API can find a result for the input location, get the latitude and longitude of this location, 
           * search Meetup API using this location. 
           * There're 2 different cases:
           * (1) the input location is a complete address, such as 'San Francisco, CA, USA', the length of data.results[] is 1, 
           * it means that this input location can be uniquely identified, so we can use this location.
           * (2) the input location is incomplete, such as 'food', google Geocode API will return a list of results, 
           * the first element of data.results[] is chosen as the location.
           */
          var addr = data.results[0].formatted_address;
          inputLan= data.results[0].geometry.location.lat;
          inputLon = data.results[0].geometry.location.lng;
          var formatedAddress = data.results[0].formatted_address;
          $("#autocomplete").val(formatedAddress);
          var location = 'lat=' + inputLan + '&lon=' + inputLon + '&radius=' + radius;
          self.searchHelper(location);
        } else {
          /* If the input location is invalid (for example, 'abcdefghij'), the Google Geocode API can't find any result for the input location.
           * Update the search status and let user enter a valid address. */
          self.searchStatus('Wrong address! Please enter a city and state...');
          self.eventStatus('');

          /* Clear all marker and empty meetupEvents and filteredList array */
          clearMarkers();
          self.meetupEvents([]);
          self.filteredList([]);

          $('#searchResults').addClass('hide');
          return;
        }
      }
    });
  };

  /* Search event results using Meetup API */
  self.searchHelper = function(location) {
    /* Update search status to be "Searching" */
    self.searchStatus('');
    self.searchStatus('Searching...');

    /* Clear all marker and empty meetupEvents and filteredList array */
    clearMarkers();
    self.meetupEvents([]);
    self.filteredList([]);

    /* Use the variable location to send request to Meetup API */
    getMeetups(location);
  };

  /* Compare search keyword against the event tag of all events. Return a filtered list and markers */
  self.filterResults = function() {
    /* Convert filter keyword to lowercase in order to allow the keyword to be case insensitive */
    var searchWord = self.filterKeyword().toLowerCase();
    var array = self.meetupEvents();
    /* If the search word is empty, return */
    if(!searchWord) {
      return;
    } else {
      /* empty the filteredList array */
      self.filteredList([]);

      /* Traverse the meetupEvents array, if the search word can match the current event tag, 
       * push that event object to the filteredList array and place the marker on the map. 
       */
      for(var i = 0; i < array.length; i++) {
        if(array[i].eventTag.toLowerCase().indexOf(searchWord) != -1) {
          self.mapMarkers()[i].marker.setMap(map);
          self.filteredList.push(array[i]);
        } else self.mapMarkers()[i].marker.setMap(null);
      }

      /* update event status with the number of total events found */
      self.eventStatus(self.numEvents() + ' events found for ' + self.filterKeyword());
    }
  };

  /* Clear keyword from filter and show all events in the current location */
  self.clearFilter = function() {
    /* update filteredList to contain all events */
    self.filteredList(self.meetupEvents());
    self.eventStatus(self.numEvents() + ' events found...');
    self.filterKeyword('');
    for(var i = 0; i < self.mapMarkers().length; i++) {
      self.mapMarkers()[i].marker.setMap(map);
    }
  };

  /* toggles the list view of the searching results */
  self.listToggle = function() {
    if(self.toggleSymbol() === 'Hide Results') {
      self.toggleSymbol('Show Results');
    } else {
      self.toggleSymbol('Hide Results');
    }
  };

  /* Use API to get events data and store the info as objects in an array */
  function getMeetups(location) {
    var meetupUrl = 'https://api.meetup.com/find/groups?key=6f4c634b253677752b591d6a67327&';
    /* Request for searching results to be sorted by memebrs number*/
    var order = '&order=members';
    /* Generate the query string */
    var query = meetupUrl + location + order;

    $.ajax({
      url: query,
      dataType: 'jsonp',
      success: function(data) {
        var len = data.data.length;

        map.panTo({lat: data.data[0].lat, lng: data.data[0].lon});
        for(var i = 0; i < len; i++) {
          var info = data.data[i];

          /* If some attribute of an event object is missing, it won't be added to searching result */
          if (info === undefined || info.name === undefined || info.lat === undefined ||
            info.lon === undefined || info.link === undefined || info.group_photo === undefined ||
            info.city === undefined || info.state === undefined || info.category === undefined ||
            info.who === undefined) {
            continue;
          }

          self.meetupEvents.push({
            eventName: info.name,
            eventLat: info.lat,
            eventLon: info.lon,
            eventLink: info.link,
            eventImg: info.group_photo.photo_link,
            eventAddress: info.city + ", " + info.state,
            eventTag: info.category.shortname,
            eventGroup: info.who
          });
        }

        /* If the query result from Meetup API is empty, update the event status and search status. */
        if(self.meetupEvents().length === 0) {
          self.searchStatus('');
          $('#searchResults').removeClass('hide');
          self.eventStatus('No event found! Please enter a new address...');
          return;
        }

        /* Show the search results list */
        $('#searchResults').removeClass('hide');
        self.filteredList(self.meetupEvents());
        mapMarkers(self.meetupEvents());
        self.searchStatus('');
      },
      error: function() {
        self.eventStatus('Error! Please refresh and try again.');
      }
    });
  }

  /* Create markers and info box on the map based on data from API */
  function mapMarkers(array) {
    $.each(array, function(index, value) {
      var latitude = value.eventLat,
          longitude = value.eventLon,
          geoLoc = new google.maps.LatLng(latitude, longitude),
          thisEvent = value.eventName;

     /* Generate the content for infobox */
      var infoContentString = '<div>' +
      '<p class="infoName">' + value.eventName + '</p>' +
      '<img src="' + value.eventImg + '" class="infoImg" alt="Image unable to load">' +
      '<p class="infoContent">' + value.eventAddress + '</p>' +
      '<p class="infoContent">Group: ' + value.eventGroup + '</p>' +
      '<p><a class="infoLink" href="' + value.eventLink + '" target="_blank">Click to view details</a></p>' +
      '</div>';

      /* Custormize map marker */
      var icon = 'img/meetupRed.png';
      var marker = new google.maps.Marker({
        position: geoLoc,
        title: thisEvent,
        map: map,
        icon: icon
      });

      self.mapMarkers.push({marker: marker, content: infoContentString});
      self.eventStatus(self.numEvents() + ' events found...');

      /* generate infobox for each event */
      google.maps.event.addListener(marker, 'click', function() {
        infobox.setContent(infoContentString);
        map.setZoom(12);
        map.setCenter(marker.position);
        infobox.open(map, marker);
        map.panBy(0, 150);

        /* Add bounce animation to the clicked marker */
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(function(){ marker.setAnimation(null); }, 2000);
      });
    });
  }

  /* When an event on the list is clicked, open the infobox for that event on the map */
  self.goToMarker = function(clickedEvent) {
    var clickedEventName = clickedEvent.eventName;
    for(var key in self.mapMarkers()) {
      if(clickedEventName === self.mapMarkers()[key].marker.title) {
          console.log("click");
        map.panTo(self.mapMarkers()[key].marker.position);
        map.setZoom(14);
        infobox.setContent(self.mapMarkers()[key].content);
        infobox.open(map, self.mapMarkers()[key].marker);
        map.panBy(0, 150);
      }
    }
  };

  /* Clear markers from map and empty the mapMarkers array */
  function clearMarkers() {
    $.each(self.mapMarkers(), function(key, value) {
      value.marker.setMap(null);
    });
    self.mapMarkers([]);
  }
}

ko.bindingHandlers.selectOnFocus = {
  update: function (element) {
    ko.utils.registerEventHandler(element, 'focus', function (e) {
      element.select();
    });
  }
};

ko.applyBindings(new findFunViewModel());