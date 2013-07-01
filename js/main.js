// var input = "http://brie.cshl.edu/~olson/refData.json";
var input = "./refData.json";
iris.require(["renderers/heatmap", "underscore", "jquery"],
function (Heatmap, _, $) {
    var BINS = 25;
    function log10(v) {
        return Math.log(v) / Math.log(10);
    }
    function byBin(v) {
        return Math.round(Math.abs(v - 1/BINS/2) * BINS) / BINS;
    }
    function loadMethData(callback) {
        $.getJSON(input, function (data) {
            var meth = crossfilter(data);
            callback(meth);
        }).fail(function () {
            console.log("Uhoh", arguments);
        });
    }
    loadMethData(function (cf) {
        var wga   = cf.dimension(function (d) { return d.WGA; }),
            wgas  = wga.group(byBin);
        
        $("#copy").append("Total <b>" + cf.size() + "</b> genes");
        
        var values = [];
        
        var minWGA = 0;
        wgas.all().forEach(function (w, i) {
            wga.filter([minWGA, w.key]);
            var meth  = cf.dimension(function (d) { return d.CHG; }),
                meths = meth.group(byBin).reduceCount();
/*
            meths.reduce(
                function add(p, v) { return p + v.WGA; },
                function rem(p, v) { return p - v.WGA; },
                function initial() { return 0; }
            );
*/
            meths.all().forEach(function (v, j) {
                values.push([i, j, log10(v.value)]);
            })
            minWGA = w.key;
        });

        var heatmap = new Heatmap({
            element: "#datavis",
            colorscheme: "Spectral",
            borderWidth: 1
        });
        heatmap.setData({
            rows:    _.pluck(wgas.all(), "key"),
            columns: _.pluck(wgas.all(), "key"),
            matrix:  values,
            maxScore: _.max(_.map(values, function (t) { return t[2] }))
        });
        heatmap.render();
    });
});
