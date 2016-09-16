


// we want to precache some of the resources
var cacheName = 'weather-v5';
var dataCacheName = 'weather-Data-v2';  // this var will store the data vs the cached static files.

var filesToCache = [
  './index.html',
  './scripts/app.js',
  './scripts/localforage.js',         // version 1.4.2
  './styles/ud811.css',
  './images/clear.png',
  './images/cloudy-scattered-showers.png',
  './images/cloudy.png',
  './images/fog.png',
  './images/ic_add_white_24px.svg',
  './images/ic_refresh_white_24px.svg',
  './images/partly-cloudy.png',
  './images/rain.png',
  './images/scattered-showers.png',
  './images/sleet.png',
  './images/snow.png',
  './images/thunderstorm.png',
  './images/wind.png'

];                           // list of the files we want to cache.

var weatherAPIUrlBase = 'https://publicdata-weather.firebaseio.com/';

// Window.caches read-only property returns the CacheStorage object associated with the current origin.
// This object enables service worker functionality such as storing assets for offline use, and generating custom responses to requests.
//        https://developer.mozilla.org/en-US/docs/Web/API/CacheStorage

self.addEventListener('install', function(evt){       // using the install event to install our SW
  console.log("Service Worker Installed ", cacheName);
  evt.waitUntil(                                      // we want to create a cache list of all the files we want to cache.
    caches.open(cacheName).then(function(cache){      // so we have to open the cache. add the file list
      return cache.addAll(filesToCache);
    }));

});

self.addEventListener('activate', function(evt){    // this is to help us not use over versions of the cache. We have to clean up the old versions of our cache. We use the activate event
  console.log("serviceWorker active ");
  evt.waitUntil(                                    // so we will use the activate event to do some version checking and delete old cache.
    caches.keys().then(function(keylist) {     // get list of current cache key
        return Promise.all(keylist.map(function(key){   // go through the list.  Promise.all returns a promise that resolves when all of the promises have resolved, or rejects with the reason of the first passed promise that rejects.
          if(key !== cacheName && key !== dataCacheName) {    // if they are not equal then delete them.  map() method creates a new array with the results of calling a provided function on every element in this array.
            console.log("Deleting old cache ", key);
            return caches.delete(key);
          }
        }));
    })
  );
});



self.addEventListener('fetch', function(evt){     // this fetch event allows us to intercept all network requests.
  // we should intercept the data requests too and store them in a different cache object
  if(evt.request.url.startsWith(weatherAPIUrlBase)){
    console.log("SW - fetch ", evt.request.url);
      evt.respondWith(
        fetch(evt.request)                  // this will fetch the request.
          .then(function(response){
            return caches.open(dataCacheName).then(function(cache) {
              console.log("SW - Putting into cache ", evt.request.url);
              cache.put(evt.request.url, response.clone());
              return response;
            })
          }));
  } else {                                                      // if its any request other than the weatherAPI request do this.
      evt.respondWith(                                          // this is the response back to the fetch request.
        caches.match(evt.request).then(function(response) {     // caches.match evaluates the request that truggered the fetch and evaluates if its avalable in the cache.
          return response ||  fetch (evt.request);             // it will respond with the response the cached the file or else fetches it from network.
        })
      );
  }
});
