
var courseviz = courseviz || {};

// Standardize window.requestAnimationFrame
if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (function () {
        return window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function (callback,element) {
            window.setTimeout(callback, 1000 / 15); // Fallback to timeout with 15 fps
        };
    })();
}

courseviz.estTimeslices = function() {
    var slices = [];
    var runners = this.runners;
    var runnerlen = runners.length;
    var i;
    var j;
    var maxslices = 0;

    if (!courseviz.runners[0].locations) this.estLocations();

    for (i = 0; i < runnerlen; i++) {
        maxslices = Math.max(maxslices, runners[i].locations.length);
    }

    for (i = 0; i < maxslices; i++) {
        var slice = [];
        slices.push(slice);

        for (j = 0; j < runnerlen; j++) {
            var locations = runners[j].locations;
            if (i < locations.length) {
                slice.push(locations[i]);
            } else {
                // continue to show runner at finish line once they have finished
                //slice.push(locations[locations.length - 1]);
            }
        }
    }

    slices.push([]); // final timeslice should not show any runners

    this.timeslices = slices;
};


courseviz.estLocations = function(interval) {
    var runners = this.runners;
    var runnerlen = runners.length;
    var trackpoints = this.trackpoints;
    var tplen = trackpoints.length;
    var fulldist = trackpoints[tplen - 1]['dist-miles'];
    var distances = [0, 3.1, 5, 10, 13.1, 20, fulldist];
    interval = this.interval = interval || this.interval || (60 * 10); // number of seconds between each timeslice

    for (var i = 0; i < runnerlen; i++) {
        var runner = runners[i];
        var tpindex = 0;

        // Convert checkpoint times to seconds
        runner.checkpoints = [
          0,
          this.toSeconds(runner['5K']),
          this.toSeconds(runner['5M']),
          this.toSeconds(runner['10M']),
          this.toSeconds(runner['13.1M']),
          this.toSeconds(runner['20M']),
          this.toSeconds(runner.chip)
        ];

        // Estimate and store location of runner at each point in time
        runner.locations = [];

        var maxseconds = Math.ceil(runner.checkpoints[runner.checkpoints.length - 1] / interval) * interval;
        for (var seconds = 0; seconds <= maxseconds; seconds += interval) {
            // estimate the distance traveled using the pace run to that point in time
            var b = this.bounds(seconds, runner.checkpoints, distances);
            var d = this.distance(seconds, b.startdist, b.enddist, b.starttime, b.endtime);

            for (; tpindex < tplen; tpindex++) {
                var tp = trackpoints[tpindex];
                var miles = tp['dist-miles'];
                if (miles >= d) {
                    runner.locations.push(new google.maps.LatLng(tp.lat, tp.lng));
                    break;
                }
            }
        }
    }
};

courseviz.bounds = function(seconds, checkpoints, distances) {
    for (var i = 1; i < checkpoints.length; i++) {
        if (seconds < checkpoints[i]) {
            return {
                startdist: distances[i - 1],
                enddist: distances[i],
                starttime: checkpoints[i - 1],
                endtime: checkpoints[i]
            };
        }
    }

    return {
        startdist: distances[distances.length - 2],
        enddist: distances[distances.length - 1],
        starttime: checkpoints[checkpoints.length - 2],
        endtime: checkpoints[checkpoints.length - 1]
    };
};

courseviz.distance = function(t, startdist, enddist, starttime, endtime) {
    var v = this.velocity(enddist - startdist, starttime, endtime);
    var result = startdist + (t - starttime) * v;
    return result;
}

courseviz.velocity = function(dist, start, finish) {
  if (start == null || finish == null) return null;
  return dist / (finish - start);
}

courseviz.toSeconds = function(time) {
    if (time == '' || time == null) return null;

    var units = time.split(':');
    var seconds = 0;

    for (var i = 0; i < units.length; i++) {
    seconds += parseInt(units[units.length - i - 1]) * Math.pow(60, i);
    }

    return seconds;
};


courseviz.formatTime = function(inputInSeconds) {
    var hours = Math.floor(inputInSeconds / 3600);
    var minutes = Math.floor((inputInSeconds - (hours * 3600)) / 60);
    var seconds = Math.floor(inputInSeconds - (hours * 3600) - (minutes * 60));
    var result = '';

    if (hours < 10) result += '0';
    result += hours + ':';

    if (minutes < 10) result += '0';
    result += minutes + ':';

    if (seconds < 10) result += '0';
    result += seconds;

    return result;
};


courseviz.addCourse = function(map) {
    // Create array of lat/lng pairs that define the course
    var points = [];
    for (var i = 0; courseviz.trackpoints[i]['dist-miles'] < 25.2; i++) {
        points.push(new google.maps.LatLng(courseviz.trackpoints[i].lat, courseviz.trackpoints[i].lng));
    }

    // Display course as a line on the map
    new google.maps.Polyline({
        path: points,
        map: map,
        icons: [{
            icon: { 
                path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
                fillColor: '#003399',
                fillOpacity: 1,
                scale: 1.5
            },
            repeat: '8px',
        }],
        strokeOpacity: 0,
        strokeColor: '#003399',
        strokeWeight: 2.5
    });

    // Create and draw the line for the last mile of the course
    var lastmile = [];
    for (i = i - 1; i < courseviz.trackpoints.length; i++) {
        lastmile.push(new google.maps.LatLng(courseviz.trackpoints[i].lat, courseviz.trackpoints[i].lng));
    }

    new google.maps.Polyline({
        path: lastmile,
        map: map,
        icons: [{
            icon: { 
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                fillColor: '#990000',
                fillOpacity: 1,
                scale: 1.5
            },
            repeat: '8px',
        }],
        strokeWidth: 0,
        strokeOpacity: 0,
    });
};

courseviz.addMileMarkers = function(map) {
    var mile = 1;
    var markers = [];

    for (i = 0; i < courseviz.trackpoints.length && mile < 27; i++) {
        var point = courseviz.trackpoints[i];
        if (point['dist-miles'] > mile) {
            markers.push(new google.maps.Marker({
                position: new google.maps.LatLng(point.lat, point.lng),
                map: map,
                icon: new google.maps.MarkerImage('images/marker' + mile + '.png'),
                visible: false
            }));
            mile++;
        }
    }

    this.mileMarkers = markers;
};


courseviz.addCheckpointMarkers = function(map) {
    var miles = [3.1, 5, 10, 13.1, 20];
    var markers = [];

    for (i = 0; i < courseviz.trackpoints.length && miles.length > 0; i++) {
        var point = courseviz.trackpoints[i];
        if (point['dist-miles'] > miles[0]) {
            markers.push(new google.maps.Marker({
                position: new google.maps.LatLng(point.lat, point.lng),
                map: map,
                icon: new google.maps.MarkerImage('images/marker' + miles[0] + '.png'),
                visible: false
            }));
            miles.shift();
        }
    }

    courseviz.checkpointMarkers = markers;
};


courseviz.showMarkers = function(markers, visible) {
    if (typeof visible === 'undefined') visible = true;
    markers.forEach(function(marker) {
        marker.setVisible(visible);
    });
};


courseviz.addHeatmap = function(map) {
    this.heatmap = new google.maps.visualization.HeatmapLayer({
        map: map
    });

    this.heatmap._map = map; // save a copy of the map for toggling heatmap visibility
    this.showHeatmap(false);
};


courseviz.showHeatmap = function(visible) {
    if (this.heatmap.visible != visible) {
        if (visible && !this.timeslices) {
            this.estTimeslices();
            this.heatmap.setData(this.timeslices[this.frame || 0]);
        }

        this.heatmap.visible = visible;
        this.heatmap.setMap(visible ? this.heatmap._map : null);
    }
};


courseviz.next = function(timestamp) {
    if (this.paused) return;
    if ((timestamp - this.lastframe) < (1000 / this.fps)) return requestAnimationFrame(this.next);

    this.lastframe = timestamp;

    this.updateRunnerMarkers();
    this.updateClock();

    if (this.timeslices && this.frame < this.maxframe) {
        this.heatmap.setData(this.timeslices[this.frame]);
        requestAnimationFrame(this.next /*, mapDiv */);
    } else if (this.frame < this.maxframe) {
        requestAnimationFrame(this.next /*, mapDiv */);
    }

    this.frame++;
    if (this.frame > this.maxframe) {
        this.frame = 0;
        this.done();
    }
}.bind(courseviz);


courseviz.play = function(interval) {
    if (this.interval != interval) {
        this.estLocations();

        if (this.heatmap.visible) this.estTimeslices();
    }

    if (!this.frame) this.frame = 0;
    if (!this.fps) this.fps = 60;
    if (this.frame == 0) {
        this.lastframe = Date.now();
        this.maxframe = this.timeslices ? this.timeslices.length : 0;
        if (this.maxframe == 0 && this.runnerMarkers) this.runnerMarkers.forEach(function (marker) {
            this.maxframe = Math.max(this.maxframe, marker.runner.locations.length);
        }.bind(this));
    }

    this.paused = false;
    requestAnimationFrame(this.next);
}.bind(courseviz);


courseviz.pause = function() {
    this.paused = true;
}.bind(courseviz);


courseviz.reset = function() {
    this.frame = 0;
    this.paused = true;
    if (this.heatmap.visible) this.heatmap.setData(this.timeslices[this.frame]);
    this.updateRunnerMarkers();
    this.updateClock()
}.bind(courseviz);


courseviz.done = function() {};


courseviz.addRunnerMarkers = function(map, runners) {
    if (!runners) return;
    if (!Array.isArray(runners)) runners = [runners];
    var markers = this.runnerMarkers || [];

    runners.forEach(function(runner) {
        markers.push(new google.maps.Marker({
            position: new google.maps.LatLng(this.trackpoints[0].lat, this.trackpoints[0].lng),
            map: map,
            icon: new google.maps.MarkerImage(this.markerImage(runner)),
            visible: true,
            runner: runner
        }));
    }.bind(this));

    this.runnerMarkers = markers;
};


courseviz.updateRunnerMarkers = function() {
    if (!this.runnerMarkers) return;
    var markers = this.runnerMarkers;
    var marker;
    var runner;

    for (var i = 0; i < markers.length; i++) {
        marker = markers[i];
        runner = marker.runner;
        if (this.frame == 0) marker.setVisible(true);

        if (runner.locations.length > this.frame) {
            marker.setPosition(runner.locations[this.frame]);
        } else {
            marker.setVisible(false);
        }
    };
};


courseviz.markerImage = function(runner) {
    if (!this.ctx) this.ctx = document.createElement('canvas').getContext('2d');
    var ctx = this.ctx;

    var fontsize = 14;
    var margin = 10;
    var font = 'bold ' + fontsize + 'px sans-serif';

    var text = runner.name.split(/\s+/g)[0];
    var bgcolor = 'rgb(0, 0, 0)';
    if (runner.place.indexOf('1/') == 0) {
        text = runner.gender + ' ' + runner.age;
        bgcolor = (runner.gender == 'M') ? 'rgb(65, 105, 225)' : 'rgb(255, 105, 180)';
    }

    ctx.font = font;
    var metrics = ctx.measureText(text);

    var rectsize = { 
        w: metrics.width + margin * 2,
        h: fontsize + margin
    };

    var trisize = { w: 10, h: rectsize.h * .3 };

    ctx.canvas.width = rectsize.w;
    ctx.canvas.height = rectsize.h + trisize.h;
    ctx.font = font;

    ctx.fillStyle = bgcolor;
    ctx.fillRect(0, 0, rectsize.w, rectsize.h);

    ctx.beginPath();
    ctx.moveTo(rectsize.w / 2 - trisize.w / 2, rectsize.h);
    ctx.lineTo(rectsize.w / 2 + trisize.w / 2, rectsize.h);
    ctx.lineTo(rectsize.w / 2, rectsize.h + trisize.h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillText(text, margin * .75, fontsize + margin * .3);

    return ctx.canvas.toDataURL();
};


courseviz.overallWinners = function() {
    var winners = [this.runners[0]];
    var gender = this.runners[0].gender;
    for (var i = 1; i < this.runners.length; i++) {
        if (this.runners[i].gender != gender) {
            winners.push(this.runners[i]);
            break;
        }
    }
    return winners;
};


courseviz.agegroupWinners = function() {
    var winners = [];
    for (var i = 0; i < this.runners.length; i++) {
        if (this.runners[i].place.indexOf('1/') == 0) {
            winners.push(this.runners[i]);
        }
    }
    return winners;
};


courseviz.runnersByName = function(names) {
    var matches = [];
    if (arguments.length > 1) names = Array.prototype.slice.call(arguments, 0);
    if (!Array.isArray(names)) names = [names];

    for (var i = 0; i < this.runners.length; i++) {
        names.forEach(function (name) {
            name = name.toLowerCase();
            if (this.runners[i].name.toLowerCase() == name) {
                matches.push(this.runners[i]);
            }
        }.bind(this));
    }

    return matches;
};


courseviz.addClock = function(map) {
    if (!this.frame) this.frame = 0;
    if (!this.interval) this.interval = 60;

    this.clockLayer = new CanvasLayer({
        map: map,
        resizeHandler: function () {},
        animate: false,
        updateHandler: courseviz.updateClock.bind(courseviz)
    });

    this.showClock(false);
};


courseviz.updateClock = function() {
    if (!this.clockLayer) return;

    var ctx = this.clockLayer.canvas.getContext('2d');
    var fontsize = 48;
    var vmargin = 30;
    var hmargin = 10;


    this.clock = this.frame * this.interval;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.font = 'bold ' + fontsize + 'px sans-serif';

    var metrics = ctx.measureText('00:00:00');
    var textpos = { 
        x: ctx.canvas.width - metrics.width - hmargin,
        y: ctx.canvas.height - vmargin
    };

    ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
    ctx.lineWidth = 4;
    ctx.strokeText(this.formatTime(this.clock), textpos.x, textpos.y);

    ctx.fillStyle = 'rgb(66, 66, 66)';
    ctx.fillText(this.formatTime(this.clock), textpos.x, textpos.y);
};


courseviz.showClock = function(visible) {
    if (this.clockLayer) $(this.clockLayer.canvas).toggle(visible);
}.bind(courseviz);


courseviz.restrictZoom = function(map, min, max) {
    google.maps.event.addListener(map, 'zoom_changed', function() {
        if (map.getZoom() < min) map.setZoom(min);
        else if (map.getZoom() > max) map.setZoom(max);
    });
};
