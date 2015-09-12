'use strict';

function findFunViewModel() {
  var self = this;
  var map, city; 
  var inputLan, inputLon;   
 
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
    var radius = 30;
    var combine = "lat=" + inputLan + "&lon=" + inputLon + "&radius=" + radius; 

    getMeetups(combine);
  };


  this.mapRequestTimeout = setTimeout(function() {
    $('#map-canvas').html('We had trouble loading Google Maps. Please refresh your browser and try again.');
  }, 6000);

    
  function mapInitialize() {
    city = new google.maps.LatLng(37.70, -122.10);
    map = new google.maps.Map(document.getElementById('map-canvas'), {
          center: city,
          zoom: 10,
          zoomControlOptions: {
            position: google.maps.ControlPosition.LEFT_CENTER,
            style: google.maps.ZoomControlStyle.SMALL
          },
          streetViewControlOptions: {
            position: google.maps.ControlPosition.LEFT_BOTTOM
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
        console.log(data);
        var len = data.data.length;
        map.panTo({lat: data.data[0].lat, lng: data.data[0].lon});
        for(var i = 0; i < len; i++) {
          var info = data.data[i];
          console.log(info);    
        }
      },
      error: function() {
        self.eventStatus('Oops, something was wrong, please refresh and try again.');
        self.loadImg('');
      }
    });
  }
    
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