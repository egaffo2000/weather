
(function() {
  'use strict';

  var injectedForecast = {              // initial data we want to display.
    key: 'chicago',
    label: 'Chicago, IL',
    currently: {
      time: 1453489481,
      summary: 'Clear',
      icon: 'partly-cloudy-day',
      temperature: 52.74,
      apparentTemperature: 74.34,
      precipProbability: 0.20,
      humidity: 0.77,
      windBearing: 125,
      windSpeed: 1.52
    },
    daily: {
      data: [
        {icon: 'clear-day', temperatureMax: 55, temperatureMin: 34},
        {icon: 'rain', temperatureMax: 55, temperatureMin: 34},
        {icon: 'snow', temperatureMax: 55, temperatureMin: 34},
        {icon: 'sleet', temperatureMax: 55, temperatureMin: 34},
        {icon: 'fog', temperatureMax: 55, temperatureMin: 34},
        {icon: 'wind', temperatureMax: 55, temperatureMin: 34},
        {icon: 'partly-cloudy-day', temperatureMax: 55, temperatureMin: 34}
      ]
    }
  };

  var weatherAPIUrlBase = 'https://publicdata-weather.firebaseio.com/';

  var app = {
    isLoading: true,
    visibleCards: {},
    selectedCities: [],
    spinner: document.querySelector('.loader'),
    cardTemplate: document.querySelector('.cardTemplate'),          // this is us getting the default template, we will swap it out and replace with read info at Run Time.
    container: document.querySelector('.main'),
    addDialog: document.querySelector('.dialog-container'),
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  };


  /*****************************************************************************
   *
   * Event listeners for UI elements
   *
   ****************************************************************************/

  /* Event listener for refresh button */
  document.getElementById('butRefresh').addEventListener('click', function() {
    app.updateForecasts();
  });

  /* Event listener for add new city button */
  document.getElementById('butAdd').addEventListener('click', function() {
    // Open/show the add new city dialog
    app.toggleAddDialog(true);
  });

  /* Event listener for add city button in add city dialog */
  document.getElementById('butAddCity').addEventListener('click', function() {
    var select = document.getElementById('selectCityToAdd');
    var selected = select.options[select.selectedIndex];
    var key = selected.value;
    var label = selected.textContent;
    app.getForecast(key, label);
    app.selectedCities.push({key: key, label: label});
    app.saveSelectedCities();

    app.toggleAddDialog(false);
  });

  /* Event listener for cancel button in add city dialog */
  document.getElementById('butAddCancel').addEventListener('click', function() {
    app.toggleAddDialog(false);
  });


  /*****************************************************************************
   *
   * Methods to update/refresh the UI
   *
   ****************************************************************************/

  // Toggles the visibility of the add new city dialog.
  app.toggleAddDialog = function(visible) {
    if (visible) {
      app.addDialog.classList.add('dialog-container--visible');
    } else {
      app.addDialog.classList.remove('dialog-container--visible');
    }
  };

  // Updates a weather card with the latest weather forecast. If the card
  // doesn't already exist, it's cloned from the template.
  app.updateForecastCard = function(data) {

    var card = app.visibleCards[data.key];        // the injectedForecast is passed in as the data param
    if (!card) {
      card = app.cardTemplate.cloneNode(true);   // we are going to copy the object in the dom on initial load. Clone it and delete it from the dom. Card is undefined at the start.
      card.classList.remove('cardTemplate');
      card.querySelector('.location').textContent = data.label;       //The textContent property sets or returns the textual content of the specified node
      card.removeAttribute('hidden');                                 // however it returns the text of all child nodes as well. So sometimes useful sometimes not
      app.container.appendChild(card);
      app.visibleCards[data.key] = card;
    }

    // we want to make sure the data is newer that what we have.
    var dataElem = card.querySelector('.date');
    if (dataElem.getAttribute('data-dt') >= data.currently.time ) {
        return; // we will do this if whats on the actual card is newer than what was passed into the function.
    }
    // now we loop through the dom replacing the data from the injectedForecast and replace the dom values of the template

    // store first the timestamp
    dataElem.setAttribute('data-dt', data.currently.time);
    dataElem.textContent = new Date(data.currently.time*1000);


    card.querySelector('.description').textContent = data.currently.summary;
    card.querySelector('.date').textContent =
      new Date(data.currently.time * 1000);
    card.querySelector('.current .icon').classList.add(data.currently.icon);
    card.querySelector('.current .temperature .value').textContent =
      Math.round(data.currently.temperature);
    card.querySelector('.current .feels-like .value').textContent =
      Math.round(data.currently.apparentTemperature);
    card.querySelector('.current .precip').textContent =
      Math.round(data.currently.precipProbability * 100) + '%';
    card.querySelector('.current .humidity').textContent =
      Math.round(data.currently.humidity * 100) + '%';
    card.querySelector('.current .wind .value').textContent =
      Math.round(data.currently.windSpeed);
    card.querySelector('.current .wind .direction').textContent =
      data.currently.windBearing;
    var nextDays = card.querySelectorAll('.future .oneday');
    var today = new Date();
    today = today.getDay();
    // we have the days store above in the app days of the week array. Nowe can we loop through for the future days.

    for (var i = 0; i < 7; i++) {
      var nextDay = nextDays[i];
      var daily = data.daily.data[i];
      if (daily && nextDay) {
        nextDay.querySelector('.date').textContent =
          app.daysOfWeek[(i + today) % 7];
        nextDay.querySelector('.icon').classList.add(daily.icon);
        nextDay.querySelector('.temp-high .value').textContent =
          Math.round(daily.temperatureMax);
        nextDay.querySelector('.temp-low .value').textContent =
          Math.round(daily.temperatureMin);
      }
    }
    if (app.isLoading) {
      app.spinner.setAttribute('hidden', true);
      app.container.removeAttribute('hidden');
      app.isLoading = false;
    }
  };


  /*****************************************************************************
   *
   * Methods for dealing with the model
   *
   ****************************************************************************/

  // Gets a forecast for a specific city and update the card with the data
  app.getForecast = function(key, label) {
    var url = weatherAPIUrlBase + key + '.json';
    // Make the XHR to get the data, then update the card
    // NOTE : we want to implement a cache first then network caching strategy.
    // This means we first request the content for the url from the caches object if its available and display it.
    // If cache is not there then get network.
    // after the cahes check we want to issue the Ajax requst to the network, get the response, push it to cache and then update the display

    if('caches' in window) {            // Window.caches read-only property returns the CacheStorage object associated with the current origin.
                                        // This object enables service worker functionality such as storing assets for offline use, and generating custom responses to requests.
        caches.match(url).then(function(response) {   // if we find the caches object has the url we requested, then respond with the cached object.
          if(response) {
            response.json().then(function(jsArray) {    // json is an object in the response that returns a promise. So get the JSON array from the response and pass it into the function as JSArray
              // only update if XHR is still pending otherwise the XHR has already returned with latest info.
              if(app.hasRequestPending) {       // if the live request returns then before cache then dont proceed.
                  console.log("updated from cache ", url);
                      jsArray.key = key;
                      jsArray.label = label;
                      app.updateForecastCard(jsArray);
                  }});
          }});
    }

    // Make XHR to get the data then update the card.
    app.hasRequestPending = true;   // flag to prevent a race condition between cache and live. If live returned before cache we dont want the cache to overwrite.
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {             // make ajax request to the weather site and send response to updateForecastCard
      if (request.readyState === XMLHttpRequest.DONE) {
        if (request.status === 200) {
          var response = JSON.parse(request.response);
          response.key = key;
          response.label = label;
          app.hasRequestPending = false;
          app.updateForecastCard(response);
        }
      }
    };
    request.open('GET', url);
    request.send();
  };

  // Iterate all of the cards and attempt to get the latest forecast data
  app.updateForecasts = function() {
    var keys = Object.keys(app.visibleCards);
    keys.forEach(function(key) {
      app.getForecast(key);
    });
  };

//
  app.saveSelectedCities = function() {
    localforage.setItem('selectedCities', app.selectedCities);
  };



// function to find a default city if none are loaded. First try and load from local storage.
// We dont want to do this until localforage is loaded and so put this all in the DOMContentLoaded Event
  document.addEventListener('DOMContentLoaded', function() {
    if(typeof localforage != "undefined") {  // no defaults so move on.
        // this means our storage is there so try and get the value of the defaults
        localforage.getItem("selectedCities").then(function(citylist){    // lets retrieve the cities for the db.
          if(citylist){               // if we have default citys stored then loop through them.
            app.selectedCities = citylist;      // if we refresh the browser we lose the stored JS file so we need to reload list back into our variable.
            citylist.forEach(function(city) {     // for each city
              app.getForecast(city.key, city.label);
            });
          } else {                      // if we dont have anything lets show the defaults.
            app.updateForecastCard(injectedForecast);
            app.selectedCities = [ {key: injectedForecast.key, label: injectedForecast.label} ];
            app.saveSelectedCities();
          }
        });
    }});


//service workers
if('serviceWorker' in navigator) {            // check if SW is allowed by browser
  navigator.serviceWorker.register('./service-worker.js');   // SW is registered at the root folder so its scope will receive fetch events on this domain.

}



})();
