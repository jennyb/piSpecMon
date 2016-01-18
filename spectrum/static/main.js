// globals, available to all modules
var hz = { 0: 'Hz', 3: 'kHz', 6: 'MHz', 9: 'GHz' };
var format = "%d/%m/%Y %X";
var debug = false;
var insertLineBreaks;
var getOptions;
var LOG;
var dispatch;
var values = { config_id: null, config: null };

define(['lib/d3/d3.v3', 'util', 'stats', 'level', 'freq', 'waterfall', 'config', 'sweep', 'rig', 'charts', 'error'],
       function (d3, util, stats, level, freq, waterfall, config, sweep, rig, charts, error) {
  "use strict";

  // initialise globals
  format = d3.time.format(format);

  insertLineBreaks = function (d) {
    var el = d3.select(this);
    var words = format(d).split(' ');
    el.text('');

    for (var i = 0; i < words.length; i++) {
      var tspan = el.append('tspan').text(words[i]);
      if (i > 0) {
        tspan.attr('x', 0).attr('dy', '15');
      }
    }
  };

  LOG = function () {
    if (debug) {
      console.log.apply(console, arguments);
    }
  };

  dispatch = d3.dispatch("config", "config_id");

  // main module definition
  return function () {
    // initialise widgets
    var widgets = {
      rig: rig(),
      stats: stats(),
      sweep: sweep(),
      config: config(),
      error: error(),
      frequency: freq({ y_axis: [-70, 70, 10], margin: { top: 50, left: 60, right: 50, bottom: 40 }, width: 1200, height: 400 }),
      level: level({ y_axis: [-70, 70, 10], margin: { top: 50, left: 60, right: 50, bottom: 40 }, width: 1200, height: 400 }),
      waterfall: waterfall({ heat: [-70, 0, 70], margin: { top: 50, left: 80, right: 50, bottom: 40 }, width: 1200, height: 400 })
    };
    widgets.charts = charts(widgets);

    function update(id, callback) {
      var widget = widgets[id];
      var path = widget.q ? widget.q() : '/' + id;
      d3.json(path, function (error, resp) {
        if (error) {
          LOG(error);
          if (resp && resp.responseText) {
            alert(id + ": " + resp.responseText);
          }
        } else {
          LOG("UPDATE", id, values, resp);
          widget.update(resp);
        }
        if (callback) {
          callback();
        }
      });
    }

    var timer = null, awaitingStop = false;

    function checkRunning() {
      d3.json('/monitor', function (error, resp) {
        if (error == null) {
          // monitor running
          update("stats");
          if (timer == null) {
            d3.select("#start").property("disabled", true);
            if (! awaitingStop) {
              d3.select("#stop").property("disabled", false);
            }
            timer = setInterval(checkRunning, 1000);
          } else {
            if (values.config_id) {
              update("charts");
            }
          }
        } else {
          // monitor not running
          awaitingStop = false;
          d3.select("#start").property("disabled", false);
          d3.select("#stop").property("disabled", true);
          d3.select("#sweep_set select").property("disabled", false);
          if (timer != null) {
            clearInterval(timer);
            timer = null;
          }
          update("error");
        }
      });
    }

    d3.select("#start").on("click", function () {
      var conf = widgets.config.get();
      LOG("START", conf);
      d3.xhr('/monitor')
        .header("Content-Type", "application/json")
        .send('PUT', JSON.stringify(conf), function (error, xhr) {
          update("sweep", function () {
            if (d3.select("#lock").property("checked")) {
              var data = JSON.parse(xhr.responseText);
              d3.select("#sweep_set select").property({ value: data.config_id, disabled: true });
              dispatch.config_id(data.config_id);
            }
          });
          checkRunning();
        });
      d3.select(this).property("disabled", true);
    });

    d3.select("#stop").on("click", function () {
      d3.select(this).property("disabled", true);
      awaitingStop = true;
      d3.json('/monitor').send('DELETE');
    });

    d3.select("#lock").on("change", function () {
      if (! d3.select(this).property("checked")) {
        d3.select("#sweep_set select").property("disabled", false);
      }
    });

    d3.select("#delete").on("click", function () {
      d3.select(this).property("disabled", true);
      d3.xhr('/spectrum/_query?refresh=true&q=config_id:' + values.config_id)
        .send('DELETE', function (error, xhr) {
          d3.xhr('/spectrum/config/' + values.config_id + '?refresh=true')
            .send('DELETE', function (error, xhr) {
              dispatch.config_id();
              update("sweep");
              d3.select("#delete").property("disabled", false);
            });
        });
    });

    d3.select("#export").on("click", function () {
      d3.xhr('/export/' + values.config_id)
        .post(null, function (error, xhr) {
          if (error) {
            alert(error);
            LOG(error);
          } else {
            alert("CSV written to " + xhr.responseText);
          }
        });
    });

    d3.select("#download").on("click", function () {
      window.open('/export/' + values.config_id, '_blank');
    });

    dispatch.on("config_id", function (config_id) {
      d3.selectAll("#shield, #charts, #controls, #error").style("display", config_id ? "initial" : "none");
      values.config_id = config_id;
      if (config_id) {
        update("config");
        update("error");
      }
    });

    dispatch.on("config", function (config) {
      values.config = config;
      if (values.config_id) {
        update("charts");
      }
    });

    d3.select("#debug").on("change", function () {
      debug = d3.select(this).property("checked");
    });

    update("rig");
    update("sweep");
    update("stats");
    checkRunning();

    // wire up options
    d3.select("#N")
      .selectAll("option")
      .data([1, 2, 3, 4, 5])
      .enter().append("option")
      .text(function (d) { return d });
    d3.selectAll("#N, #top").on("change", function () {
      setTimeout(widgets.charts.updateLevel, 1);
    });
    d3.select("#sweep").on("change", function () {
      setTimeout(widgets.charts.updateFreq, 1);
    });

    d3.select("body").style("display", "block");
  };
});
