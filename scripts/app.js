(function () {
    'use strict';

    var app = {
        isLoadingFirst: true,
        isLoading: true,
        cacheName: "cache-ver2",
        visibleCards: {},
        selectedTimetables: [],
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        addDialog: document.querySelector('.dialog-container')
    };

    document.getElementById('butRefresh').addEventListener('click', function () {
        app.updateSchedules();
    });

    document.getElementById('butAdd').addEventListener('click', function () {
        app.toggleAddDialog(true);
    });

    document.getElementById('butAddCity').addEventListener('click', function () {

        var select = document.getElementById('selectTimetableToAdd');
        var selected = select.options[select.selectedIndex];
        var key = selected.value;
        var label = selected.textContent;
        if (!app.selectedTimetables) {
            app.selectedTimetables = [];
        }
        app.getSchedule(key, label);
        app.selectedTimetables.push({key: key, label: label});
        app.toggleAddDialog(false);
        app.saveScheduleTimetables();
    });

    document.getElementById('butAddCancel').addEventListener('click', function () {
        app.toggleAddDialog(false);
    });

    app.toggleAddDialog = function (visible) {
        if (visible) {
            app.addDialog.classList.add('dialog-container--visible');
        } else {
            app.addDialog.classList.remove('dialog-container--visible');
        }
    };

    app.updateTimetableCard = function (data) {

        var key = data.key;
        var dataLastUpdated = new Date(data.created);
        var schedules = data.schedules;
        var card = app.visibleCards[key];

        if (!card) {
            var label = data.label.split(', ');
            var title = label[0];
            var subtitle = label[1];
            card = app.cardTemplate.cloneNode(true);
            card.classList.remove('cardTemplate');
            card.querySelector('.label').textContent = title;
            card.querySelector('.subtitle').textContent = subtitle;
            card.removeAttribute('hidden');
            app.container.appendChild(card);
            app.visibleCards[key] = card;
        }
        card.querySelector('.card-last-updated').textContent = data.created;

        var scheduleUIs = card.querySelectorAll('.schedule');
        for (var i = 0; i < 4; i++) {
            var schedule = schedules[i];
            var scheduleUI = scheduleUIs[i];
            if (schedule && scheduleUI) {
                scheduleUI.querySelector('.message').textContent = schedule.message;
            }
        }

        if (app.isLoading) {
            window.cardLoadTime = performance.now();
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

    app.configurationIndexedDB = function () {
        localforage.config({
            driver: localforage.IndexedDB,
            name: 'cache-bd'
        });
    };

    app.registerServiceWorker = function () {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
            .register('./service-worker.js')
            .catch(err => console.log(`Service Worker error: ${err}`));
        }
    };

    app.saveScheduleTimetables = function () {
        localforage.setItem(app.cacheName, JSON.stringify(app.selectedTimetables));
    };

    app.getScheduleDefault = function () {
        app.getSchedule('metros/1/bastille/A', 'Bastille, Direction La Défense');
        app.selectedTimetables = [
            {key: initialStationTimetable.key, label: initialStationTimetable.label}
        ];
        app.saveScheduleTimetables();
    };

    app.getScheduleFirstRequest = function () {
        localforage.getItem(app.cacheName).then(function (timetablesCache) {
            app.selectedTimetables = timetablesCache;
            if (app.selectedTimetables) {
                app.selectedTimetables = JSON.parse(app.selectedTimetables);
                app.selectedTimetables.forEach(function (timetable) {
                    app.getSchedule(timetable.key, timetable.label);
                });
            } else {
               app.getScheduleDefault();
            }
        }).catch(function (err) {
            app.getScheduleDefault();
        });

    };

    app.getSchedule = function (key, label) {

        var url = 'https://api-ratp.pierre-grimaud.fr/v3/schedules/' + key;

        // TODO add cache logic here
        if ('caches' in window) {
            caches.match(url).then(function (response) {
                if (response) {
                    response.json().then(function updateFromCache(json) {
                        var results = {};
                        result.key = key;
                        result.label = label;
                        result.created = response._metadata.date;
                        result.schedules = response.result.schedules;
                        app.updateTimetableCard(result);
                    });
                }
            });
        }

        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (request.readyState === XMLHttpRequest.DONE) {
                if (request.status === 200) {
                    var response = JSON.parse(request.response);
                    var result = {};
                    result.key = key;
                    result.label = label;
                    result.created = response._metadata.date;
                    result.schedules = response.result.schedules;
                    app.updateTimetableCard(result);
                    if(app.isLoadingFirst){
                        window.cardLoadTimeNew = performance.now();
                        app.isLoadingFirst = false;
                    }
                }
            } else {
                // Return the initial weather forecast since no data is available.
                app.updateTimetableCard(initialStationTimetable);
            }
        };
        request.open('GET', url);
        request.send();
    };

    // Iterate all of the cards and attempt to get the latest timetable data
    app.updateSchedules = function () {
        var keys = Object.keys(app.visibleCards);
        keys.forEach(function (key) {
            app.getSchedule(key);
        });
    };

    /*
     * Fake timetable data that is presented when the user first uses the app,
     * or when the user has not saved any stations. See startup code for more
     * discussion.
     */

    var initialStationTimetable = {

        key: 'metros/1/bastille/A',
        label: 'Bastille, Direction La Défense',
        created: '2017-07-18T17:08:42+02:00',
        schedules: [
            {
                message: '0 mn'
            },
            {
                message: '2 mn'
            },
            {
                message: '5 mn'
            }
        ]
    };

    app.configurationIndexedDB();
    app.getScheduleFirstRequest();
    app.registerServiceWorker();

})();
